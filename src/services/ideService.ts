import fs from 'node:fs';
import path from 'node:path';
import { configService } from './configService.js';
import { writeJsonFile } from '../utils/fileSystem.js';
import { paths } from '../constants/paths.js';
import { log } from '../utils/logger.js';

interface IdeTemplate {
  name: string;
  apply: (providerName: string) => void;
}

interface CliInvocation {
  command: string;
  args: string[];
}

const CLI_SERVER_NAME = 'sentineltm';

const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const arraysEqual = (left: string[] | undefined, right: string[]): boolean => {
  if (!Array.isArray(left) || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
};

const resolveCliServeInvocation = (): CliInvocation => {
  const cliEntry = paths.cliEntry();
  if (fs.existsSync(cliEntry)) {
    const execPath = process.execPath;
    const usesNodeExecutable = /node(?:\.exe)?$/i.test(execPath);
    const command = usesNodeExecutable ? 'node' : execPath;
    return {
      command,
      args: [cliEntry, 'serve', '--mcp-stdio'],
    };
  }

  return {
    command: 'st',
    args: ['serve', '--mcp-stdio'],
  };
};

const createMcpConfig = (providerName: string) => {
  const config = configService.load();
  const invocation = resolveCliServeInvocation();
  const defaultsProvider = providerName || config.defaults.provider || 'gemini-cli';

  return {
    mcpServers: {
      [CLI_SERVER_NAME]: {
        command: invocation.command,
        args: invocation.args,
        env: {},
      },
    },
    defaults: {
      provider: defaultsProvider,
      ...(config.defaults.model ? { model: config.defaults.model } : {}),
    },
  };
};

type MutableJson = Record<string, unknown>;

const ensureMcpConfig = (targetPath: string, providerName: string): void => {
  const invocation = resolveCliServeInvocation();
  const sentinelConfig = configService.load();
  const desiredProvider = providerName || sentinelConfig.defaults.provider;

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

  if (Array.isArray(config.servers)) {
    config.servers = config.servers.map((entry: unknown) => {
      const server: MutableJson =
        entry && typeof entry === 'object' ? { ...(entry as MutableJson) } : {};

      const command = typeof server.command === 'string' ? server.command : undefined;
      if (command !== invocation.command) {
        server.command = invocation.command;
        updated = true;
      }
      const args = Array.isArray(server.args) ? (server.args as string[]) : undefined;
      if (!args || !arraysEqual(args, invocation.args)) {
        server.args = invocation.args;
        updated = true;
      }
      if (!server.env || typeof server.env !== 'object') {
        server.env = {};
        updated = true;
      }
      // Remove deprecated fields if they exist
      if (server.transport !== undefined) {
        delete server.transport;
        updated = true;
      }
      if (server.models !== undefined) {
        delete server.models;
        updated = true;
      }
      if (!server.name) {
        server.name = 'SentinelTM';
        updated = true;
      }

      return server;
    });
  } else {
    const existingServers =
      config.mcpServers && typeof config.mcpServers === 'object'
        ? { ...(config.mcpServers as MutableJson) }
        : undefined;

    const server: MutableJson =
      existingServers?.[CLI_SERVER_NAME] && typeof existingServers[CLI_SERVER_NAME] === 'object'
        ? { ...(existingServers[CLI_SERVER_NAME] as MutableJson) }
        : {};

    const command = typeof server.command === 'string' ? server.command : undefined;
    if (command !== invocation.command) {
      server.command = invocation.command;
      updated = true;
    }
    const args = Array.isArray(server.args) ? (server.args as string[]) : undefined;
    if (!args || !arraysEqual(args, invocation.args)) {
      server.args = invocation.args;
      updated = true;
    }
    if (!server.env || typeof server.env !== 'object') {
      server.env = {};
      updated = true;
    }
    // Remove deprecated fields if they exist
    if (server.transport !== undefined) {
      delete server.transport;
      updated = true;
    }
    if (server.models !== undefined) {
      delete server.models;
      updated = true;
    }

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      updated = true;
    }

    const hadExtraServers = existingServers
      ? Object.keys(existingServers).some((key) => key !== CLI_SERVER_NAME)
      : false;
    if (hadExtraServers) {
      updated = true;
    }

    config.mcpServers = { [CLI_SERVER_NAME]: server };
  }

  const defaults: MutableJson =
    config.defaults && typeof config.defaults === 'object'
      ? { ...(config.defaults as MutableJson) }
      : {};

  const currentProvider = typeof defaults.provider === 'string' ? defaults.provider : undefined;
  if (desiredProvider && currentProvider !== desiredProvider) {
    defaults.provider = desiredProvider;
    updated = true;
  }

  const currentModel = typeof defaults.model === 'string' ? defaults.model : undefined;
  if (sentinelConfig.defaults.model && currentModel !== sentinelConfig.defaults.model) {
    defaults.model = sentinelConfig.defaults.model;
    updated = true;
  }

  config.defaults = defaults;

  if (updated) {
    writeJsonFile(targetPath, config);
    log.success('  Normalized mcp.json to use SentinelTM server');
  }
};

const createDefaultRules = () => ({
  entrypoint: {
    filename: 'main.py',
    maxLines: 4,
    mustImportOnly: true,
  },
  style: {
    maxLineLength: 79,
    noSideEffectsOnImport: true,
    absoluteImportsOnly: true,
  },
  forbidden: {
    functions: ['print(', 'eval(', 'exec(', 'console.log('],
    modules: ['subprocess', 'os.system'],
  },
  externalization: {
    textsPath: 'data/texts/*.json',
    configPath: 'data/config/*.json',
    enforceNoHardcodedStrings: true,
  },
  quality: {
    minCoverage: 80,
    requireTests: true,
    requireDocs: true,
  },
});

const applyIdeProfile = (profileName: string, targetDir: string, providerName: string) => {
  ensureDir(targetDir);
  const mcpTargetPath = path.join(targetDir, 'mcp.json');
  writeJsonFile(mcpTargetPath, createMcpConfig(providerName));
  ensureMcpConfig(mcpTargetPath, providerName);
  
  // Copy or create rules.json
  const projectRulesPath = path.join(process.cwd(), '.sentineltm', 'config', 'rules.json');
  const targetRulesPath = path.join(targetDir, 'rules.json');
  
  if (fs.existsSync(projectRulesPath)) {
    // Copy existing rules from .sentineltm
    try {
      fs.copyFileSync(projectRulesPath, targetRulesPath);
      log.success(`  Copied rules.json to ${profileName}`);
    } catch (error) {
      log.warn(`  Could not copy rules.json: ${(error as Error).message}`);
    }
  } else {
    // Create default rules.json
    try {
      writeJsonFile(targetRulesPath, createDefaultRules());
      log.success(`  Created default rules.json in ${profileName}`);
    } catch (error) {
      log.warn(`  Could not create rules.json: ${(error as Error).message}`);
    }
  }
};

const applyVsCode = (providerName: string): void => {
  const root = process.cwd();
  const vscodeDir = path.join(root, '.vscode');
  ensureDir(vscodeDir);
  writeJsonFile(path.join(vscodeDir, 'settings.json'), {
    'sentinel.tm.enabled': true,
    'sentinel.tm.provider': providerName,
  });
  writeJsonFile(path.join(vscodeDir, 'tasks.json'), {
    version: '2.0.0',
    tasks: [
      {
        label: 'Sentinel Gate',
        type: 'shell',
        command: 'st gate run',
        group: 'build',
      },
    ],
  });
  writeJsonFile(path.join(vscodeDir, 'extensions.json'), {
    recommendations: ['ms-vscode.vscode-typescript-next'],
  });

  applyIdeProfile('VS Code', vscodeDir, providerName);
};

const applyCursor = (providerName: string): void => {
  const root = process.cwd();
  const cursorDir = path.join(root, '.cursor');
  applyIdeProfile('Cursor', cursorDir, providerName);
};

const applyZed = (providerName: string): void => {
  const root = process.cwd();
  const zedDir = path.join(root, '.zed');
  ensureDir(zedDir);
  const invocation = resolveCliServeInvocation();
  writeJsonFile(path.join(zedDir, 'settings.json'), {
    'assistant.default': 'sentinel',
    'assistant.providers': {
      sentinel: {
        ...invocation,
      },
    },
  });
  applyIdeProfile('Zed', zedDir, providerName);
};

const applyWindsurf = (providerName: string): void => {
  const root = process.cwd();
  const windsurfDir = path.join(root, '.windsurf');
  applyIdeProfile('Windsurf', windsurfDir, providerName);
};

const applyProfile = (name: string, providerName: string): void => {
  const root = process.cwd();
  const targetDir = path.join(root, `.${name.toLowerCase()}`);
  applyIdeProfile(name, targetDir, providerName);
};

const templates: IdeTemplate[] = [
  { name: 'VS Code', apply: applyVsCode },
  { name: 'Cursor', apply: applyCursor },
  { name: 'Zed', apply: applyZed },
  { name: 'Windsurf', apply: applyWindsurf },
  { name: 'Trae', apply: (command: string) => applyProfile('Trae', command) },
  { name: 'Kiro', apply: (command: string) => applyProfile('Kiro', command) },
  { name: 'Continue', apply: (command: string) => applyProfile('Continue', command) },
  { name: 'Cline', apply: (command: string) => applyProfile('Cline', command) },
  { name: 'Codex', apply: (command: string) => applyProfile('Codex', command) },
  { name: 'Claude', apply: (command: string) => applyProfile('Claude', command) },
  { name: 'Gemini', apply: (command: string) => applyProfile('Gemini', command) },
  { name: 'OpenCode', apply: (command: string) => applyProfile('OpenCode', command) },
  { name: 'Roo', apply: (command: string) => applyProfile('Roo', command) },
  { name: 'Amp', apply: (command: string) => applyProfile('Amp', command) },
  { name: 'Kilo', apply: (command: string) => applyProfile('Kilo', command) },
];

export const applyIdeTargets = (targets: string[]): string[] => {
  const provider = configService.load().defaults.provider;
  const applied: string[] = [];

  if (targets.length === 0) {
    // No targets specified, apply all
    templates.forEach((template) => {
      template.apply(provider);
      applied.push(template.name);
    });
  } else {
    // Apply only specified targets
    const normalizedTargets = targets.map((t) => t.toLowerCase());
    templates.forEach((template) => {
      const templateName = template.name.toLowerCase();
      if (normalizedTargets.includes(templateName) || normalizedTargets.includes('all')) {
        template.apply(provider);
        applied.push(template.name);
      }
    });
  }

  paths.ensureDir(paths.profilesDir());
  return applied;
};
