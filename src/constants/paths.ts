import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..', '..');

const SENTINEL_DIR = '.sentineltm';

export const paths = {
  appRoot: (): string => appRoot,
  root: (): string => process.cwd(),
  sentinelRoot: (): string => path.join(process.cwd(), SENTINEL_DIR),
  configDir: (): string => path.join(paths.sentinelRoot(), 'config'),
  cacheDir: (): string => path.join(paths.sentinelRoot(), 'cache'),
  dbDir: (): string => path.join(paths.sentinelRoot(), 'db'),
  profilesDir: (): string => path.join(appRoot, SENTINEL_DIR, 'profiles'),
  scriptsDir: (): string => path.join(paths.sentinelRoot(), 'scripts'),
  shimsDir: (): string => path.join(paths.scriptsDir(), 'shims'),
  configFile: (): string => path.join(paths.configDir(), 'config.json'),
  providersCache: (): string => path.join(paths.cacheDir(), 'providers.json'),
  modelsCache: (provider: string): string =>
    path.join(paths.cacheDir(), 'models-' + provider + '.json'),
  packageJson: (): string => path.join(paths.root(), 'package.json'),
  indexDb: (): string => path.join(paths.dbDir(), 'index.db'),
  researchDb: (): string => paths.indexDb(),
  ideProfile: (ide: string): string => path.join(paths.profilesDir(), ide),
  cliEntry: (): string => path.join(appRoot, 'dist', 'cli.js'),
  ensureDir: (dir: string): void => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  },
};

export const systemPaths = {
  pathEntries: (): string[] => {
    const sysPath = process.env.PATH || process.env.Path || '';
    return sysPath.split(path.delimiter).filter(Boolean);
  },
  shellExts: (): string[] => {
    if (os.platform() === 'win32') {
      return ['.exe', '.cmd', '.bat', '.ps1'];
    }
    return [''];
  },
};
