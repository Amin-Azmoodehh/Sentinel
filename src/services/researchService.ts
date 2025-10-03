import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { configService } from './configService.js';
import { detectProviders, loadProvidersFromCache } from './providerService.js';
import { log } from '../utils/logger.js';
import { paths, systemPaths } from '../constants/paths.js';
import { sqliteService } from './sqliteService.js';

const MAX_HISTORY = 20;

const findWithExtensions = (basePath: string): string | null => {
  for (const ext of systemPaths.shellExts()) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const locateCommand = (provider: string): string | null => {
  let providers = loadProvidersFromCache();
  let match = providers.find((item) => item.name === provider && item.path);
  if (!match) {
    providers = detectProviders().providers;
    match = providers.find((item) => item.name === provider && item.path);
  }
  if (match && match.path) {
    return match.path;
  }
  const shimCmd = findWithExtensions(path.join(paths.shimsDir(), provider));
  if (shimCmd) {
    return shimCmd;
  }
  for (const entry of systemPaths.pathEntries()) {
    const candidate = findWithExtensions(path.join(entry, provider));
    if (candidate) {
      return candidate;
    }
  }
  return null;
};

const persistResearch = (prompt: string, response: string) => {
  const now = Date.now();
  sqliteService.run('INSERT INTO research (prompt, response, created_at) VALUES (?, ?, ?)', [
    prompt,
    response,
    now,
  ]);
  const rows = sqliteService.all('SELECT id FROM research ORDER BY created_at DESC');
  if (rows.length > MAX_HISTORY) {
    const idsToRemove = rows.slice(MAX_HISTORY).map((row) => Number(row.id));
    const placeholders = idsToRemove.map(() => '?').join(',');
    if (placeholders.length > 0) {
      sqliteService.run('DELETE FROM research WHERE id IN (' + placeholders + ')', idsToRemove);
    }
  }
};

export const runResearch = (prompt: string): string => {
  const provider = configService.load().defaults.provider;
  const commandPath = locateCommand(provider);
  if (!commandPath) {
    log.warn('Provider command not found. Unable to execute research.');
    return 'Provider unavailable';
  }
  const argsVariants = [
    ['research', '--prompt', prompt, '--json'],
    ['research', '--prompt', prompt],
    ['research', prompt],
  ];
  for (const args of argsVariants) {
    const result = spawnSync(commandPath, args, {
      encoding: 'utf-8',
      input: prompt,
      timeout: 15000,
    });
    if (result.status === 0) {
      const output = result.stdout.trim() || result.stderr.trim() || 'No response';
      persistResearch(prompt, output);
      return output;
    }
  }
  log.warn('Research command failed for provider ' + provider + '.');
  return 'Research failed';
};
