import fs from 'node:fs';
import fsExtra from 'fs-extra';
import path from 'node:path';
import { resolvePath } from '../utils/fileSystem.js';
import { splitFile, SplitSummary } from './fileSplitService.js';

// Get workspace root - prefer SENTINEL_WORKSPACE env var, fallback to cwd
// When running as MCP server, Windsurf/Cursor should set this env var to project root
let workspaceRoot = path.resolve(process.env.SENTINEL_WORKSPACE || process.cwd());

// Export function to allow updating workspace root dynamically
export const setWorkspaceRoot = (newRoot: string): void => {
  workspaceRoot = path.resolve(newRoot);
};

export const getWorkspaceRoot = (): string => {
  return workspaceRoot;
};

export type FileEncoding = BufferEncoding;

export interface ReadFileOptions {
  encoding?: FileEncoding;
  maxBytes?: number;
}

export interface ReadFileResult {
  path: string;
  content: string;
  bytes: number;
  encoding: FileEncoding;
  modifiedAt: number;
}

export interface WriteFileOptions {
  encoding?: FileEncoding;
  mode?: 'overwrite' | 'append';
}

export interface WriteFileResult {
  path: string;
  bytesWritten: number;
  mode: 'overwrite' | 'append';
  encoding: FileEncoding;
  created: boolean;
}

const ensureWorkspacePath = (input: string): string => {
  // Remove quotes and trim
  const cleaned = input.replace(/^["']+|["']+$/g, '').trim();

  // Check for invalid characters
  if (/[<>|\0]/.test(cleaned)) {
    throw new Error('Path contains invalid characters: ' + input);
  }

  const resolved = path.normalize(path.resolve(resolvePath(cleaned)));

  // Block path traversal attempts
  if (cleaned.includes('..')) {
    throw new Error('Path traversal not allowed');
  }

  // Ensure path is within workspace
  if (!resolved.startsWith(workspaceRoot)) {
    throw new Error('Path must stay within workspace');
  }

  return resolved;
};

const uniqueStrings = (items: string[]): string[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
};

export const listFiles = async (pattern?: string): Promise<string[]> => {
  const cwd = process.cwd();
  if (!pattern) {
    try {
      const entries = fs.readdirSync(cwd, { withFileTypes: true });
      return entries
        .map((entry) => {
          const name = entry.name;
          if (entry.isDirectory()) {
            return `${name}/`;
          } else if (entry.isFile()) {
            const stats = fs.statSync(path.join(cwd, name));
            const size = stats.size;
            const sizeStr = size > 1024 ? `${Math.round(size / 1024)}KB` : `${size}B`;
            return `${name} (${sizeStr})`;
          }
          return name;
        })
        .sort();
    } catch (error) {
      throw new Error(
        `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (path.isAbsolute(pattern) || pattern.includes('..')) {
    throw new Error('Glob pattern must stay inside workspace');
  }
  const { default: fg } = await import('fast-glob');
  const matches = await fg(pattern, { dot: true, cwd });
  return matches.sort();
};

export const movePath = async (source: string, destination: string): Promise<void> => {
  const src = ensureWorkspacePath(source);
  const dst = ensureWorkspacePath(destination);
  await fsExtra.move(src, dst, { overwrite: true });
};

export const copyPath = async (source: string, destination: string): Promise<void> => {
  const src = ensureWorkspacePath(source);
  const dst = ensureWorkspacePath(destination);
  await fsExtra.copy(src, dst, { overwrite: true });
};

export const removePath = async (target: string, force = false): Promise<void> => {
  const resolved = ensureWorkspacePath(target);
  if (!force && !fs.existsSync(resolved)) {
    throw new Error('Path not found: ' + target);
  }
  await fsExtra.remove(resolved);
};

export const splitLargeFile = (filePath: string, maxLines?: number): SplitSummary | null =>
  splitFile(ensureWorkspacePath(filePath), maxLines);

export interface DirectoryCreateResult {
  created: string[];
  skipped: string[];
}

export const createDirectories = async (paths: string[]): Promise<DirectoryCreateResult> => {
  const created: string[] = [];
  const skipped: string[] = [];
  for (const entry of uniqueStrings(paths)) {
    const target = ensureWorkspacePath(entry);
    if (fs.existsSync(target)) {
      skipped.push(target);
      continue;
    }
    await fsExtra.mkdirp(target);
    created.push(target);
  }
  return { created, skipped };
};

export const readFileContent = (target: string, options: ReadFileOptions = {}): ReadFileResult => {
  const encoding: FileEncoding = options.encoding ?? 'utf8';
  const resolved = ensureWorkspacePath(target);
  if (!fs.existsSync(resolved)) {
    throw new Error('Path not found: ' + target);
  }
  const stats = fs.statSync(resolved);
  if (stats.isDirectory()) {
    throw new Error('Cannot read directory content: ' + target);
  }
  const buffer = fs.readFileSync(resolved);
  const bytes = options.maxBytes ? Math.min(buffer.length, options.maxBytes) : buffer.length;
  const content = buffer.toString(encoding, 0, bytes);
  return {
    path: resolved,
    content,
    bytes,
    encoding,
    modifiedAt: stats.mtimeMs,
  };
};

export const writeFileContent = (
  target: string,
  content: string,
  options: WriteFileOptions = {}
): WriteFileResult => {
  const encoding: FileEncoding = options.encoding ?? 'utf8';
  const mode: 'overwrite' | 'append' = options.mode ?? 'overwrite';
  const resolved = ensureWorkspacePath(target);
  const dir = path.dirname(resolved);
  fsExtra.ensureDirSync(dir);
  const data = Buffer.from(String(content), encoding);
  const exists = fs.existsSync(resolved);
  if (mode === 'append' && exists) {
    fs.appendFileSync(resolved, data, { encoding });
  } else {
    fs.writeFileSync(resolved, data, { encoding });
  }
  return {
    path: resolved,
    bytesWritten: data.length,
    mode,
    encoding,
    created: !exists,
  };
};
