import fs from 'node:fs';
import path from 'node:path';
import { writeJsonFile } from '../utils/fileSystem.js';
import { paths } from '../constants/paths.js';
import { log } from '../utils/logger.js';

export interface CliInvocation {
  command: string;
  args: string[];
}

export type MutableJson = Record<string, unknown>;

export const CLI_SERVER_NAME = 'sentineltm';

export const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const copyFolderRecursive = (source: string, target: string): void => {
  if (!fs.existsSync(source)) return;
  ensureDir(target);
  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    if (fs.statSync(sourcePath).isDirectory()) {
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
};

export const arraysEqual = (left: string[] | undefined, right: string[]): boolean => {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

export const resolveCliServeInvocation = (): CliInvocation => {
  const cliEntry = paths.cliEntry();
  if (fs.existsSync(cliEntry)) {
    const execPath = process.execPath;
    const usesNodeExecutable = /node(?:\.exe)?$/i.test(execPath);
    const command = usesNodeExecutable ? 'node' : execPath;
    return { command, args: [cliEntry, 'serve', '--mcp-stdio'] };
  }
  return { command: 'st', args: ['serve', '--mcp-stdio'] };
};

export const createMcpConfig = (_providerName: string, workspacePath: string) => {
  const invocation = resolveCliServeInvocation();
  const argsWithWorkspace = [...invocation.args, '--workspace', workspacePath];
  return {
    mcpServers: {
      [CLI_SERVER_NAME]: {
        command: invocation.command,
        args: argsWithWorkspace,
        env: {
          // Keep env for compatibility, but args take precedence
          SENTINEL_WORKSPACE: workspacePath,
          SENTINEL_LOG_LEVEL: 'info',
          SENTINEL_AUTO_INDEX: 'true',
        },
      },
    },
  };
};

export const ensureMcpConfig = (targetPath: string, workspacePath: string): void => {
  const invocation = resolveCliServeInvocation();
  let config: MutableJson = {};
  if (fs.existsSync(targetPath)) {
    try {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      config = raw.trim() ? (JSON.parse(raw) as MutableJson) : {};
    } catch {
      log.warn('  Existing mcp.json was invalid JSON. Rebuilding it.');
      config = {};
    }
  }

  let updated = false;

  if (Array.isArray((config as any).servers)) {
    (config as any).servers = (config as any).servers.map((entry: unknown) => {
      const server: MutableJson = entry && typeof entry === 'object' ? { ...(entry as MutableJson) } : {};

      const command = typeof (server as any).command === 'string' ? (server as any).command : undefined;
      if (command !== invocation.command) {
        (server as any).command = invocation.command;
        updated = true;
      }
      const args = Array.isArray((server as any).args) ? ((server as any).args as string[]) : undefined;
      const desiredArgs = [...invocation.args, '--workspace', workspacePath];
      if (!args || !arraysEqual(args, desiredArgs)) {
        (server as any).args = desiredArgs;
        updated = true;
      }
      if (!(server as any).env || typeof (server as any).env !== 'object') {
        (server as any).env = {};
        updated = true;
      }

      const serverEnv = (server as any).env as MutableJson;
      const currentWorkspace = typeof serverEnv.SENTINEL_WORKSPACE === 'string' ? (serverEnv.SENTINEL_WORKSPACE as string) : '';
      if (!currentWorkspace || (currentWorkspace as string).includes('${') || !path.isAbsolute(currentWorkspace as string)) {
        serverEnv.SENTINEL_WORKSPACE = workspacePath;
        updated = true;
      }
      if (serverEnv.SENTINEL_LOG_LEVEL !== 'info') {
        serverEnv.SENTINEL_LOG_LEVEL = 'info';
        updated = true;
      }
      if (serverEnv.SENTINEL_AUTO_INDEX !== 'true') {
        serverEnv.SENTINEL_AUTO_INDEX = 'true';
        updated = true;
      }

      if ((server as any).transport !== undefined) {
        delete (server as any).transport;
        updated = true;
      }
      if ((server as any).models !== undefined) {
        delete (server as any).models;
        updated = true;
      }
      if (!(server as any).name) {
        (server as any).name = 'SentinelTM';
        updated = true;
      }

      return server;
    });
  } else {
    const existingServers = (config as any).mcpServers && typeof (config as any).mcpServers === 'object' ? { ...((config as any).mcpServers as MutableJson) } : undefined;

    const server: MutableJson = existingServers?.[CLI_SERVER_NAME] && typeof existingServers[CLI_SERVER_NAME] === 'object' ? { ...(existingServers[CLI_SERVER_NAME] as MutableJson) } : {};

    const command = typeof (server as any).command === 'string' ? (server as any).command : undefined;
    if (command !== invocation.command) {
      (server as any).command = invocation.command;
      updated = true;
    }
    const args = Array.isArray((server as any).args) ? ((server as any).args as string[]) : undefined;
    const desiredArgs = [...invocation.args, '--workspace', workspacePath];
    if (!args || !arraysEqual(args, desiredArgs)) {
      (server as any).args = desiredArgs;
      updated = true;
    }
    if (!(server as any).env || typeof (server as any).env !== 'object') {
      (server as any).env = {};
      updated = true;
    }

    const serverEnv = (server as any).env as MutableJson;
    const currentWorkspace = typeof serverEnv.SENTINEL_WORKSPACE === 'string' ? (serverEnv.SENTINEL_WORKSPACE as string) : '';
    if (!currentWorkspace || (currentWorkspace as string).includes('${') || !path.isAbsolute(currentWorkspace as string)) {
      serverEnv.SENTINEL_WORKSPACE = workspacePath;
      updated = true;
    }
    if (serverEnv.SENTINEL_LOG_LEVEL !== 'info') {
      serverEnv.SENTINEL_LOG_LEVEL = 'info';
      updated = true;
    }
    if (serverEnv.SENTINEL_AUTO_INDEX !== 'true') {
      serverEnv.SENTINEL_AUTO_INDEX = 'true';
      updated = true;
    }

    if ((server as any).transport !== undefined) {
      delete (server as any).transport;
      updated = true;
    }
    if ((server as any).models !== undefined) {
      delete (server as any).models;
      updated = true;
    }

    if (!(config as any).mcpServers || typeof (config as any).mcpServers !== 'object') {
      updated = true;
    }

    const hadExtraServers = existingServers ? Object.keys(existingServers).some((key) => key !== CLI_SERVER_NAME) : false;
    if (hadExtraServers) {
      updated = true;
    }

    (config as any).mcpServers = { [CLI_SERVER_NAME]: server } as any;
  }

  if ((config as any).defaults !== undefined) {
    delete (config as any).defaults;
    updated = true;
  }
  if ((config as any).providers !== undefined) {
    delete (config as any).providers;
    updated = true;
  }

  if (updated) {
    writeJsonFile(targetPath, config);
    log.success('  Normalized mcp.json to use SentinelTM server');
  }
};
