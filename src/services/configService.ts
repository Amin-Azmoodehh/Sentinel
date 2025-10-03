import fs from 'node:fs';
import { defaultConfig } from '../constants/defaults.js';
import { paths } from '../constants/paths.js';
import { readJsonFile, writeJsonFile } from '../utils/fileSystem.js';

export type Config = typeof defaultConfig & Record<string, unknown>;

const ensureConfigDirs = (): void => {
  paths.ensureDir(paths.configDir());
  paths.ensureDir(paths.cacheDir());
  paths.ensureDir(paths.dbDir());
  paths.ensureDir(paths.profilesDir());
};

const mergeConfig = (base: Config, overrides: Record<string, unknown>): Config => ({
  ...base,
  ...overrides,
  defaults: {
    ...base.defaults,
    ...(overrides.defaults as Record<string, unknown> | undefined),
  },
  thresholds: {
    ...base.thresholds,
    ...(overrides.thresholds as Record<string, unknown> | undefined),
  },
  security: {
    ...base.security,
    ...(overrides.security as Record<string, unknown> | undefined),
  },
  i18n: {
    ...base.i18n,
    ...(overrides.i18n as Record<string, unknown> | undefined),
  },
  meta: {
    ...(base.meta as Record<string, unknown> | undefined),
    ...(overrides.meta as Record<string, unknown> | undefined),
    gate: {
      ...(((base.meta as Record<string, unknown> | undefined)?.gate as Record<string, unknown>) ??
        {}),
      ...(((overrides.meta as Record<string, unknown> | undefined)?.gate as Record<
        string,
        unknown
      >) ?? {}),
    },
  },
});

const readConfig = (): Config => {
  ensureConfigDirs();
  const configPath = paths.configFile();
  if (!fs.existsSync(configPath)) {
    writeJsonFile(configPath, defaultConfig);
    return JSON.parse(JSON.stringify(defaultConfig)) as Config;
  }
  const fileConfig = readJsonFile<Record<string, unknown>>(configPath, {});
  return mergeConfig(JSON.parse(JSON.stringify(defaultConfig)) as Config, fileConfig);
};

let configCache: Config | null = null;

const getCache = (): Config => {
  if (!configCache) {
    configCache = readConfig();
  }
  return configCache;
};

export interface ConfigService {
  load: () => Config;
  save: (config: Config) => void;
  getValue: (key: string) => unknown;
  setValue: (key: string, value: unknown) => Config;
}

const accessNested = (target: Record<string, unknown>, key: string): unknown => {
  const parts = key.split('.');
  let current: unknown = target;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const setNested = (target: Record<string, unknown>, key: string, value: unknown): void => {
  const parts = key.split('.');
  let current: Record<string, unknown> = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value as never;
    } else {
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
  });
};

export const configService: ConfigService = {
  load: () => JSON.parse(JSON.stringify(getCache())) as Config,
  save: (next: Config) => {
    const configPath = paths.configFile();
    writeJsonFile(configPath, next);
    configCache = mergeConfig(JSON.parse(JSON.stringify(defaultConfig)) as Config, next);
  },
  getValue: (key: string) => {
    const cache = getCache();
    return accessNested(cache as Record<string, unknown>, key);
  },
  setValue: (key: string, value: unknown) => {
    const cache = getCache();
    setNested(cache as Record<string, unknown>, key, value);
    configService.save(cache);
    return cache;
  },
};

export const resolveKeyPath = (key: string): string => key.split('.').join('.');
