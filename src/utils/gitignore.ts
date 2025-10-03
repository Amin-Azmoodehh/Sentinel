import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';

export const createIgnoreMatcher = (root: string): Ignore => {
  const factory = ignore as unknown as () => Ignore;
  const ig = factory();
  const gitignorePath = path.join(root, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    ig.add(content);
  }
  return ig;
};

export const isIgnored = (matcher: Ignore, relativePath: string) => matcher.ignores(relativePath);
