import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { SqlValue } from 'sql.js';
import { sqliteService } from './sqliteService.js';
import { configService } from './configService.js';
import { createIgnoreMatcher, isIgnored } from '../utils/gitignore.js';
import { sha256 } from '../utils/hash.js';
import { splitFile } from './fileSplitService.js';
import { log } from '../utils/logger.js';

const SKIP_DIRS = new Set(['.git', '.sentineltm', 'node_modules', 'dist', 'build', 'out']);

const languageByExtension: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'markdown',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cs': 'csharp',
};

const toPosix = (input: string): string => input.split(path.sep).join('/');
const workspaceRoot = path.resolve(process.cwd());

const ensureWorkspacePath = (input: string): string => {
  const resolved = path.resolve(workspaceRoot, input);
  if (resolved === workspaceRoot) {
    return resolved;
  }
  if (!resolved.startsWith(workspaceRoot + path.sep)) {
    throw new Error('Path must stay within indexed workspace');
  }
  return resolved;
};

const detectLanguage = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  return languageByExtension[ext] || 'unknown';
};

const countLines = (content: string): number => content.split(/\r?\n/).length;

interface FileMeta {
  path: string;
  absPath: string;
  size: number;
  lines: number;
  hash: string;
  lang: string;
  mtime: number;
  createdAt: number;
}

interface ExtractedSymbol {
  name: string;
  kind: string;
  line: number;
  col: number;
}

const statFile = (root: string, filePath: string): FileMeta => {
  const absPath = path.join(root, filePath);
  const stats = fs.statSync(absPath);
  const content = fs.readFileSync(absPath, 'utf-8');
  const lines = countLines(content);
  return {
    path: toPosix(filePath),
    absPath,
    size: stats.size,
    lines,
    hash: sha256(content),
    lang: detectLanguage(filePath),
    mtime: Math.floor(stats.mtimeMs),
    createdAt: Math.floor(stats.ctimeMs),
  };
};

const gatherFiles = (root: string): string[] => {
  const matcher = createIgnoreMatcher(root);
  const files: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      const relPath = path.relative(root, absPath);
      if (!relPath) {
        continue;
      }
      const posixRel = toPosix(relPath);
      if (isIgnored(matcher, posixRel)) {
        continue;
      }
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        stack.push(absPath);
      } else if (entry.isFile()) {
        files.push(posixRel);
      }
    }
  }
  return files.sort();
};

const upsertFileMeta = (meta: FileMeta): number => {
  sqliteService.run(
    'INSERT INTO files (path, size, lines, hash, lang, mtime, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)' +
      ' ON CONFLICT(path) DO UPDATE SET size = excluded.size, lines = excluded.lines, hash = excluded.hash,' +
      ' lang = excluded.lang, mtime = excluded.mtime',
    [meta.path, meta.size, meta.lines, meta.hash, meta.lang, meta.mtime, meta.createdAt]
  );
  const row = sqliteService.get('SELECT id FROM files WHERE path = ?', [meta.path]);
  return row ? Number(row.id) : 0;
};

const removeMissingFiles = (currentPaths: Set<string>): void => {
  const rows = sqliteService.all('SELECT path FROM files');
  rows.forEach((row) => {
    const filePath = String(row.path);
    if (!currentPaths.has(filePath)) {
      sqliteService.run('DELETE FROM files WHERE path = ?', [filePath]);
    }
  });
};

const extractSymbolsFromFile = (filePath: string, content: string): ExtractedSymbol[] => {
  const symbols: ExtractedSymbol[] = [];
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const visitor = (node: ts.Node) => {
    let name = '';
    let kind = '';

    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
      kind = 'function';
    } else if (ts.isClassDeclaration(node) && node.name) {
      name = node.name.text;
      kind = 'class';
    } else if (ts.isInterfaceDeclaration(node) && node.name) {
      name = node.name.text;
      kind = 'interface';
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.name && ts.isIdentifier(decl.name)) {
          name = decl.name.text;
          kind = 'variable';
        }
      }
    }

    if (name && kind) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      symbols.push({ name, kind, line: line + 1, col: character + 1 });
    }

    ts.forEachChild(node, visitor);
  };

  visitor(sourceFile);
  return symbols;
};

const upsertSymbols = (fileId: number, symbols: ExtractedSymbol[]): void => {
  sqliteService.transaction(() => {
    sqliteService.run('DELETE FROM symbols WHERE file_id = ?', [fileId]);
    symbols.forEach((s) => {
      sqliteService.run(
        'INSERT INTO symbols (file_id, name, kind, line, col) VALUES (?, ?, ?, ?, ?)',
        [fileId, s.name, s.kind, s.line, s.col]
      );
    });
  });
};

const processFile = (
  root: string,
  relPath: string,
  processed: Set<string>,
  maxLines: number
): void => {
  const absPath = path.join(root, relPath);
  const content = fs.readFileSync(absPath, 'utf-8');
  const lines = countLines(content);

  if (lines > maxLines) {
    const summary = splitFile(absPath, maxLines);
    if (summary) {
      log.info('Auto-splitting ' + relPath + ' due to line limit.');
      const aggregatorContent = fs.readFileSync(absPath, 'utf-8');
      const aggregatorLines = countLines(aggregatorContent);
      if (aggregatorLines <= maxLines) {
        processFile(root, relPath, processed, maxLines);
      }
      summary.parts.forEach((partPath) => {
        const partRel = toPosix(path.relative(root, partPath));
        processFile(root, partRel, processed, maxLines);
      });
      return;
    }
  }

  const meta = statFile(root, relPath);
  const fileId = upsertFileMeta(meta);
  processed.add(meta.path);

  if (fileId > 0 && meta.lang === 'typescript') {
    const symbols = extractSymbolsFromFile(absPath, content);
    upsertSymbols(fileId, symbols);
  }
};

export const indexProject = (root: string): void => {
  const config = configService.load();
  const maxLines = config.thresholds?.maxIndexLines ?? 300;
  const files = gatherFiles(root);
  const processed = new Set<string>();
  files.forEach((relPath) => {
    processFile(root, relPath, processed, maxLines);
  });
  removeMissingFiles(processed);
  config.index = config.index || {};
  (config.index as Record<string, unknown>).lastRun = Date.now();
  configService.save(config);
};

export const indexStatus = () => {
  const filesCount = sqliteService.get('SELECT COUNT(*) as total FROM files') as {
    total: number;
  } | null;
  const symbolsCount = sqliteService.get('SELECT COUNT(*) as total FROM symbols') as {
    total: number;
  } | null;
  const config = configService.load();
  const lastRun = config.index && (config.index as Record<string, unknown>).lastRun;
  return {
    files: filesCount ? Number(filesCount.total) : 0,
    symbols: symbolsCount ? Number(symbolsCount.total) : 0,
    lastRun: typeof lastRun === 'number' ? lastRun : null,
  };
};

export interface IndexedFileResult {
  path: string;
  size: number;
  lines: number;
  lang: string;
  mtime: number;
}

const capLimit = (limit?: number, fallback = 20, max = 200): number => {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return fallback;
  }
  if (limit < 1) {
    return 1;
  }
  return Math.min(Math.floor(limit), max);
};

import { tinyFuse } from '../utils/tiny-fuse.js';

export const searchIndexedFiles = (query: string, limit?: number): IndexedFileResult[] => {
  const term = query?.trim();
  if (!term) {
    return [];
  }

  const allFiles = sqliteService
    .all('SELECT path, size, lines, lang, mtime FROM files')
    .map((row) => ({
      path: String(row.path || ''),
      size: Number(row.size || 0),
      lines: Number(row.lines || 0),
      lang: String(row.lang || 'unknown'),
      mtime: Number(row.mtime || 0),
    }));

  const fuseResults = tinyFuse(allFiles, term, { keys: ['path'], threshold: 0.4 });
  const capped = capLimit(limit);

  return fuseResults.slice(0, capped);
};

export interface ContentSearchResult {
  file: string;
  line: number;
  content: string;
  matchCount: number;
}

export const searchFileContents = (query: string, limit?: number): ContentSearchResult[] => {
  const term = query?.trim();
  if (!term) {
    return [];
  }

  const allFiles = sqliteService
    .all('SELECT path FROM files')
    .map((row) => String(row.path || ''));

  const results: ContentSearchResult[] = [];
  const lowerTerm = term.toLowerCase();
  const capped = capLimit(limit) || 50;

  for (const filePath of allFiles) {
    if (results.length >= capped) break;
    try {
      const absPath = path.resolve(workspaceRoot, filePath);
      if (!fs.existsSync(absPath)) continue;
      const content = fs.readFileSync(absPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      let matchCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (results.length >= capped) break;
        const line = lines[i];
        if (line.toLowerCase().includes(lowerTerm)) {
          matchCount++;
          results.push({
            file: filePath,
            line: i + 1,
            content: line.trim(),
            matchCount,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return results;
};

export interface IndexedSymbolRecord {
  id: number;
  filePath: string;
  name: string;
  kind: string;
  line: number;
  col: number;
}

export interface SymbolQueryOptions {
  filePath?: string;
  name?: string;
  kind?: string;
  limit?: number;
}

export const listIndexedSymbols = (options: SymbolQueryOptions = {}): IndexedSymbolRecord[] => {
  const filters: string[] = [];
  const values: SqlValue[] = [];
  if (options.filePath) {
    filters.push('files.path = ?');
    values.push(toPosix(options.filePath));
  }
  if (options.name) {
    filters.push('symbols.name LIKE ?');
    values.push('%' + options.name.trim() + '%');
  }
  if (options.kind) {
    filters.push('symbols.kind = ?');
    values.push(options.kind.trim());
  }
  const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
  const limit = capLimit(options.limit, 50);
  const rows = sqliteService.all(
    'SELECT symbols.id, symbols.name, symbols.kind, symbols.line, symbols.col, files.path as filePath ' +
      'FROM symbols INNER JOIN files ON files.id = symbols.file_id ' +
      whereClause +
      ' ORDER BY files.path ASC, symbols.line ASC LIMIT ?',
    [...values, limit]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    kind: String(row.kind || ''),
    line: Number(row.line || 0),
    col: Number(row.col || 0),
    filePath: String(row.filePath || ''),
  }));
};

export interface FileDocumentResult {
  path: string;
  content: string;
  lang: string;
  size: number;
  lines: number;
}

export const getFileDocument = (filePath: string, maxBytes = 50_000): FileDocumentResult | null => {
  const normalized = toPosix(filePath);
  const fileRow = sqliteService.get('SELECT * FROM files WHERE path = ?', [normalized]);
  if (!fileRow) {
    return null;
  }
  const absolute = ensureWorkspacePath(normalized);
  if (!fs.existsSync(absolute)) {
    return null;
  }
  const buffer = fs.readFileSync(absolute);
  const truncated = buffer.slice(0, maxBytes);
  const content = truncated.toString('utf-8');
  return {
    path: normalized,
    content,
    lang: detectLanguage(absolute),
    size: buffer.byteLength,
    lines: countLines(content),
  };
};

export interface SearchResult {
  file: string;
  line: number | null;
  content: string;
}

export const searchIndex = (query: string): SearchResult[] => {
  const results: SearchResult[] = [];
  const term = query?.trim();

  if (!term) {
    log.warn('Search query is empty');
    return [];
  }

  // Search in file paths
  const files = searchIndexedFiles(term, 50);
  log.info(`Found ${files.length} files matching "${term}"`);
  files.forEach((f) => {
    results.push({ file: f.path, line: null, content: `${f.lang} file (${f.lines} lines)` });
  });

  // Search in symbols
  const symbols = listIndexedSymbols({ name: term, limit: 50 });
  log.info(`Found ${symbols.length} symbols matching "${term}"`);
  symbols.forEach((s) => {
    results.push({ file: s.filePath, line: s.line, content: `${s.kind}: ${s.name}` });
  });

  // If no results, provide helpful info
  if (results.length === 0) {
    const stats = indexStatus();
    log.warn(
      `No results found for "${term}". Index has ${stats.files} files, ${stats.symbols} symbols`
    );
  }

  return results;
};
