import fs from 'node:fs';
import path from 'node:path';

export const readJsonFile = <T>(filePath: string, fallback: T): T => {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    const message = 'Failed to read JSON at ' + filePath + ': ' + (error as Error).message;
    throw new Error(message);
  }
};

export const writeJsonFile = (filePath: string, value: unknown): void => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const json = JSON.stringify(value, null, 2);
  fs.writeFileSync(filePath, json);
};

export const touchFile = (filePath: string): void => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
};

export const resolvePath = (inputPath: string, basePath?: string): string => {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(basePath || process.cwd(), inputPath);
};
