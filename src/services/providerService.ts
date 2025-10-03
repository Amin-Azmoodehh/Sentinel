import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { paths, systemPaths } from '../constants/paths.js';
import { configService } from './configService.js';
import { readJsonFile, writeJsonFile } from '../utils/fileSystem.js';
import { log, formatHeading } from '../utils/logger.js';
import chalk from 'chalk';

export interface ProviderInfo {
  name: string;
  command: string;
  path: string | null;
  available: boolean;
}

export interface ProviderDetectResult {
  providers: ProviderInfo[];
  scanned: string[];
}

const PROVIDER_ALIASES: Record<string, string[]> = {
  codex: ['codex', 'codex-cli'],
  gemini: ['gemini', 'gemini-cli'],
  qwen: ['qwen', 'qwen-cli'],
  ollama: ['ollama'],
};

const PROVIDER_ALLOWLIST = Object.freeze(Object.keys(PROVIDER_ALIASES));

export const normalizeProviderName = (provider: string): string => {
  const trimmed = (provider || '').trim().toLowerCase();
  if (!trimmed) {
    return provider;
  }
  for (const [canonical, aliases] of Object.entries(PROVIDER_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === trimmed)) {
      return canonical;
    }
  }
  return provider;
};

const getProviderAliases = (provider: string): string[] => {
  const canonical = normalizeProviderName(provider);
  const aliases = PROVIDER_ALIASES[canonical];
  if (aliases) {
    return aliases;
  }
  return [provider];
};

const providersCachePath = paths.providersCache();

const readProvidersCache = (): ProviderInfo[] =>
  readJsonFile<ProviderInfo[]>(providersCachePath, []);

const writeProvidersCache = (providers: ProviderInfo[]): void => {
  writeJsonFile(providersCachePath, providers);
};

const findExecutableInDir = (dir: string, names: string[]): string | null => {
  for (const name of names) {
    for (const ext of systemPaths.shellExts()) {
      const candidate = path.join(dir, name + ext);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
};

const locateExecutable = (names: string[]): string | null => {
  const shimDir = paths.shimsDir();
  if (fs.existsSync(shimDir)) {
    const shimMatch = findExecutableInDir(shimDir, names);
    if (shimMatch) {
      return shimMatch;
    }
  }
  for (const entry of systemPaths.pathEntries()) {
    const match = findExecutableInDir(entry, names);
    if (match) {
      return match;
    }
  }
  return null;
};

const execVersionCheck = (commandPath: string): boolean => {
  const result = spawnSync(commandPath, ['--version'], {
    encoding: 'utf-8',
    timeout: 7000,
    shell: true,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.trim() : 'No stderr output';
    log.warn(`--version check failed for ${commandPath}. Stderr: ${stderr}`);
  }
  return result.status === 0;
};

export const detectProviders = (): ProviderDetectResult => {
  const scanned: string[] = [];
  const providers: ProviderInfo[] = [];

  Object.entries(PROVIDER_ALIASES).forEach(([name, aliases]) => {
    const exePath = locateExecutable(aliases);
    scanned.push(...aliases);
    const available = exePath ? execVersionCheck(exePath) : false;
    providers.push({
      name,
      command: aliases[0],
      path: exePath,
      available,
    });
  });

  writeProvidersCache(providers);

  return { providers, scanned };
};

export const setProvider = (provider: string): void => {
  const config = configService.load();
  config.defaults.provider = provider;
  configService.save(config);
  const aliases = getProviderAliases(provider);
  const exePath = locateExecutable(aliases);
  if (!exePath) {
    log.warn('Provider ' + provider + ' command not found on PATH. Value kept in config.');
    return;
  }
  const ok = execVersionCheck(exePath);
  if (!ok) {
    log.warn('Provider ' + provider + ' is present but failed --version check.');
  } else {
    log.success('Provider ' + provider + ' set successfully.');
  }
};

export interface ModelsListResult {
  models: string[];
  source: 'provider' | 'cache';
}

const runModelList = (commandPath: string): string[] | null => {
  const result = spawnSync(commandPath, ['models', 'list', '--json'], {
    encoding: 'utf-8',
    timeout: 2000,
    shell: true,
    windowsHide: true,
  });
  if (result.status !== 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map((value: unknown) => String(value));
    }
    if (Array.isArray(parsed.models)) {
      return parsed.models.map((value: unknown) => String(value));
    }
  } catch (error) {
    const message = 'Failed to parse model list: ' + (error as Error).message;
    log.warn(message);
  }
  return null;
};

export const listModels = (provider?: string): ModelsListResult => {
  const config = configService.load();
  const currentProvider = config.defaults.provider;
  const selectedProvider = provider || currentProvider;
  const aliases = getProviderAliases(selectedProvider);
  const canonical = normalizeProviderName(selectedProvider);
  const exePath = locateExecutable(aliases);
  if (!exePath) {
    const cached = readJsonFile<string[]>(paths.modelsCache(canonical), []);
    if (cached.length === 0) {
      log.warn('No provider executable found and no cached models for ' + canonical + '.');
    }
    return { models: cached, source: 'cache' };
  }
  const models = runModelList(exePath);
  if (models && models.length > 0) {
    writeJsonFile(paths.modelsCache(canonical), models);
    return { models, source: 'provider' };
  }
  const cached = readJsonFile<string[]>(paths.modelsCache(canonical), []);
  if (cached.length === 0) {
    log.warn('Failed to list models from provider and no cache available.');
  }
  return { models: cached, source: 'cache' };
};

export const detectModels = (): ProviderDetectResult => {
  const result = detectProviders();

  if (result.providers.length === 0) {
    log.warn('No providers are registered in Sentinel configuration.');
    return result;
  }

  log.raw(formatHeading('AI Provider Detection'));
  log.raw('');

  result.providers.forEach((provider) => {
    if (provider.available) {
      const pathInfo = provider.path ? chalk.dim(` (${provider.path})`) : '';
      log.provider(`${chalk.bold(provider.name)} ${chalk.green('✓ Available')}${pathInfo}`);
    } else {
      const reason = provider.path ? 'version check failed' : 'not found';
      log.warn(`${chalk.bold(provider.name)} ${chalk.red('✗ ' + reason)}`);
    }
  });

  log.raw('');
  const availableCount = result.providers.filter((provider) => provider.available).length;
  if (availableCount === 0) {
    log.error('No AI providers are available!');
  } else {
    log.rocket(
      `${chalk.bold(availableCount)} AI provider${availableCount > 1 ? 's' : ''} ready for action!`
    );
  }

  return result;
};

export const statusModels = (): void => {
  const config = configService.load();
  const providerInput = config.defaults.provider;
  const provider = normalizeProviderName(providerInput);
  const model = config.defaults.model;
  const aliases = getProviderAliases(provider);
  const exePath = locateExecutable(aliases);
  if (!exePath) {
    log.warn('Provider ' + providerInput + ' command not found on PATH.');
    return;
  }
  const ok = execVersionCheck(exePath);
  if (!ok) {
    log.warn('Provider ' + provider + ' is present but failed --version check.');
  } else {
    log.success('Provider ' + provider + ' and model ' + model + ' are set and available.');
  }
};

export const setModel = (model: string): void => {
  const config = configService.load();
  config.defaults.model = model;
  configService.save(config);
  log.success('Default model set to ' + model + '.');
};

export const loadProvidersFromCache = (): ProviderInfo[] => readProvidersCache();

export const getAllowedProviders = (): string[] => [...PROVIDER_ALLOWLIST];

export const resolvePreferredProvider = (): ProviderInfo => {
  const config = configService.load();
  const preferredRaw = config.defaults.provider || 'gemini';
  const preferred = normalizeProviderName(preferredRaw);
  const detection = detectProviders();
  const exact = detection.providers.find((p) => p.name === preferred && p.available);
  if (exact) {
    return exact;
  }
  const fallback = detection.providers.find((p) => p.available);
  if (fallback) {
    if (config.defaults.provider !== fallback.name) {
      config.defaults.provider = fallback.name;
      configService.save(config);
    }
    return fallback;
  }
  return {
    name: preferred,
    command: (PROVIDER_ALIASES[preferred] || [preferred])[0],
    path: null,
    available: false,
  };
};
