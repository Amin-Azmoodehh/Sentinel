import fs from 'node:fs';
import path from 'node:path';
import { resolvePath } from '../utils/fileSystem.js';
import { log } from '../utils/logger.js';

const importRegExp = /^(import\s|export\s+\*\s+from\s|require\s*\()/;
const boundaryRegExp =
  /^(export\s+|class\s+|function\s+|async\s+function\s+|interface\s+|type\s+|const\s+[A-Za-z0-9_]+\s*=\s*\(|let\s+[A-Za-z0-9_]+\s*=\s*\(|var\s+[A-Za-z0-9_]+\s*=\s*\()/;

const splitLines = (content: string): string[] => content.split(/\r?\n/);

const gatherImports = (lines: string[]): { imports: string[]; bodyStart: number } => {
  const imports: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (trimmed === '' || trimmed.startsWith('//')) {
      imports.push(lines[index]);
      index += 1;
      continue;
    }
    if (importRegExp.test(trimmed)) {
      imports.push(lines[index]);
      index += 1;
      continue;
    }
    break;
  }
  return { imports, bodyStart: index };
};

const chunkBody = (lines: string[], maxLines: number, importsCount: number) => {
  const chunks: string[][] = [];
  let current: string[] = [];
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track brace depth
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
    }

    current.push(line);

    const isBoundary = boundaryRegExp.test(trimmed);
    const limitReached = current.length + importsCount >= maxLines;
    const atTopLevel = braceDepth === 0;

    // Only split at top level when limit reached and at boundary
    if (current.length > 0 && isBoundary && limitReached && atTopLevel && i < lines.length - 1) {
      chunks.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
};

const createPartsDir = (filePath: string): string => {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const partsDir = path.join(dir, base + '_parts');
  if (fs.existsSync(partsDir)) {
    fs.rmSync(partsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(partsDir, { recursive: true });
  return partsDir;
};

const writePartFiles = (
  partsDir: string,
  baseName: string,
  extension: string,
  imports: string[],
  chunks: string[][]
): { files: string[]; defaultIndex: number | null } => {
  const partFiles: string[] = [];
  let defaultIndex: number | null = null;
  chunks.forEach((chunk, index) => {
    const partNumber = index + 1;
    const filename = baseName + '.part' + String(partNumber) + extension;
    const absolutePath = path.join(partsDir, filename);
    const lines: string[] = [];
    if (imports.length > 0) {
      lines.push(...imports);
      if (imports[imports.length - 1].trim() !== '') {
        lines.push('');
      }
    }
    lines.push(...chunk);
    const partContent = lines.join('\n');
    fs.writeFileSync(absolutePath, partContent.trimEnd() + '\n');
    partFiles.push(filename);
    if (defaultIndex === null && chunk.join('\n').includes('export default')) {
      defaultIndex = index;
    }
  });
  return { files: partFiles, defaultIndex };
};

const writeIndexFile = (
  partsDir: string,
  extension: string,
  partFiles: string[],
  defaultIndex: number | null
): void => {
  const lines: string[] = [];
  partFiles.forEach((file) => {
    const modulePath = './' + file.replace(path.extname(file), '');
    lines.push("export * from '" + modulePath + "';");
  });
  if (defaultIndex !== null) {
    const defaultPath =
      './' + partFiles[defaultIndex].replace(path.extname(partFiles[defaultIndex]), '');
    lines.push("export { default } from '" + defaultPath + "';");
  }
  fs.writeFileSync(path.join(partsDir, 'index' + extension), lines.join('\n') + '\n');
};

const rewriteOriginalFile = (
  filePath: string,
  baseName: string,
  extension: string,
  partFiles: string[],
  defaultIndex: number | null
): void => {
  const lines: string[] = [];
  const moduleBase = './' + baseName + '_parts';
  partFiles.forEach((file) => {
    const modulePath = moduleBase + '/' + file.replace(extension, '');
    lines.push("export * from '" + modulePath + "';");
  });
  if (defaultIndex !== null) {
    const defaultPath = moduleBase + '/' + partFiles[defaultIndex].replace(extension, '');
    lines.push("export { default } from '" + defaultPath + "';");
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
};

export interface SplitSummary {
  original: string;
  parts: string[];
  maxLines: number;
}

export const splitFile = (target: string, maxLines = 300): SplitSummary | null => {
  const filePath = resolvePath(target);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + target);
  }
  if (filePath.includes('_parts') || path.basename(filePath).includes('.part')) {
    log.warn('Skipping already-split file: ' + target);
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = splitLines(content);
  if (lines.length <= maxLines) {
    return null;
  }
  const { imports, bodyStart } = gatherImports(lines);
  const bodyLines = lines.slice(bodyStart);
  const chunks = chunkBody(bodyLines, maxLines, imports.length);
  if (chunks.length <= 1) {
    log.warn('Unable to split ' + target + ' into multiple parts.');
    return null;
  }
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension);
  const partsDir = createPartsDir(filePath);
  const { files, defaultIndex } = writePartFiles(partsDir, baseName, extension, imports, chunks);
  writeIndexFile(partsDir, extension, files, defaultIndex);
  rewriteOriginalFile(filePath, baseName, extension, files, defaultIndex);
  log.info('Split ' + target + ' into ' + String(files.length) + ' parts.');
  return { original: filePath, parts: files.map((name) => path.join(partsDir, name)), maxLines };
};
