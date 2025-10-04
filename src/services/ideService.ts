import fs from 'node:fs';
import path from 'node:path';
import { configService } from './configService.js';
import { writeJsonFile } from '../utils/fileSystem.js';
import { paths } from '../constants/paths.js';
import { log } from '../utils/logger.js';

interface IdeTemplate {
  name: string;
  apply: (providerName: string, applyRules: boolean) => void;
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

const copyFolderRecursive = (source: string, target: string): void => {
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
  const defaultsProvider = providerName || config.defaults.provider || 'ollama';
  const defaultsModel = config.defaults.model || 'llama3';

  return {
    $schema: 'https://modelcontextprotocol.io/schema/mcp.json',
    version: '1.0.0',
    description: 'SentinelTM MCP Server Configuration - AI-powered development orchestrator with quality gates, secure file operations, and intelligent shell execution',
    mcpServers: {
      [CLI_SERVER_NAME]: {
        command: invocation.command,
        args: invocation.args,
        env: {
          SENTINEL_LOG_LEVEL: 'info',
          SENTINEL_AUTO_INDEX: 'true',
        },
        timeout: 30000,
        restart: {
          maxAttempts: 3,
          delay: 1000,
        },
        capabilities: {
          filesystem: true,
          shell: true,
          indexing: true,
          qualityGates: true,
          taskManagement: true,
        },
      },
    },
    defaults: {
      provider: defaultsProvider,
      model: defaultsModel,
      temperature: 0.7,
      maxTokens: 4096,
    },
    features: {
      autoIndex: true,
      qualityGateOnSave: false,
      secureShellExecution: true,
      filesystemSandbox: true,
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
  $schema: 'https://json-schema.org/draft-07/schema',
  version: '1.6.3',
  contract: {
    version: '3.0',
    name: 'Zero Tolerance Python Contract',
    enforcement: 'MANDATORY',
    binding: 'ABSOLUTE',
    violations: 'AUTOMATIC_REJECTION',
  },
  entrypoint: {
    filename: 'main.py',
    maxLines: 4,
    mustImportOnly: true,
    noLogic: true,
    noSideEffects: true,
  },
  style: {
    maxLineLength: 79,
    pep8Compliant: true,
    noSideEffectsOnImport: true,
    absoluteImportsOnly: true,
    noRelativeImports: true,
    noWildcardImports: true,
  },
  typing: {
    typeHintsRequired: true,
    typeHintsCoverage: 100,
    enforceEverywhere: true,
  },
  forbidden: {
    functions: ['print(', 'console.log('],
    modules: ['subprocess', 'os.system'],
    hardcodedStrings: true,
    hardcodedNumbers: true,
    hardcodedUrls: true,
    hardcodedRegex: true,
  },
  externalization: {
    textsPath: 'data/texts/*.yml',
    configPath: 'data/config/*.yml',
    enforceNoHardcodedStrings: true,
    enforceNoHardcodedNumbers: true,
    allConfigFromYaml: true,
  },
  architecture: {
    maxFileLines: 300,
    modularOnly: true,
    separationOfConcerns: true,
  },
  i18n: {
    logsLanguage: 'en',
    uiLanguage: 'fa',
    enforceLogLanguage: true,
    enforceUiLanguage: true,
  },
  quality: {
    minCoverage: 80,
    requireTests: true,
    requireDocs: true,
    scoreThreshold: 100,
    zeroTolerance: true,
  },
  validation: {
    preGeneration: {
      acknowledgmentRequired: true,
      explicitRulesCheck: true,
    },
    postGeneration: {
      selfAssessmentRequired: true,
      evidenceRequired: true,
      validationCommands: [
        'wc -l main.py',
        "grep -r 'print(' app/",
        'grep -r \'".*"\' app/ | wc -l',
        'find . -name "*.py" -exec wc -l {} \\;',
      ],
    },
    scoring: {
      totalRules: 12,
      passingScore: 12,
      failureAction: 'REJECT_AND_REWRITE',
    },
  },
  deliverables: {
    required: [
      'Pre-Generation Acknowledgment',
      'Generated Code',
      'Self-Assessment Table',
      'Validation Commands Output',
      'Final Verdict (PASS/FAIL)',
    ],
    mandatoryFormat: {
      preGeneration: 'I acknowledge the following BINDING rules: ✓ main.py will be exactly ≤4 lines ✓ Zero hardcoded strings/numbers/URLs ✓ Zero print() statements ✓ All config from YAML files ✓ Type hints on every function ✓ PEP8 with ≤79 chars/line ✓ Files ≤300 lines maximum ✓ Absolute imports only ✓ English logs / Persian UI ✓ Modular architecture. I will provide self-assessment after generation.',
      selfAssessment: 'MANDATORY_TABLE_WITH_EVIDENCE',
      finalVerdict: 'Score: X/12, Grade: PASS ✅ / FAIL ❌',
    },
  },
  enforcement: {
    scoreRequired: 12,
    totalRules: 12,
    passingThreshold: '12/12',
    failureAction: 'COMPLETE_REWRITE_REQUIRED',
    noExceptions: true,
    evidenceRequired: true,
    contractualBinding: true,
  },
  validationCommands: {
    mainPyLines: 'wc -l main.py',
    hardcodedStrings: 'grep -r \'".*"\' app/ | wc -l',
    printStatements: "grep -r 'print(' app/",
    fileLineLimits: 'find . -name "*.py" -exec wc -l {} \\;',
    lineLength: 'find app/ -name "*.py" -exec grep -n \'.\\{80,\\}\' {} +',
    relativeImports: "grep -r 'from \\.' app/",
    typeHints: 'python -m mypy app/ --strict',
  },
  apiIntegration: {
    preferredProviders: ['ollama', 'openai', 'claude', 'gemini', 'mistral', 'openrouter'],
    fallbackBehavior: 'graceful',
    timeoutMs: 30000,
  },
});

const applyIdeProfile = (
  profileName: string,
  targetDir: string,
  providerName: string,
  applyRules: boolean
) => {
  ensureDir(targetDir);
  const mcpTargetPath = path.join(targetDir, 'mcp.json');
  writeJsonFile(mcpTargetPath, createMcpConfig(providerName));
  ensureMcpConfig(mcpTargetPath, providerName);

  // Copy or create rules.json
  const projectRulesPath = path.join(process.cwd(), 'rules.example.json');
  const fallbackRulesPath = path.join(process.cwd(), '.sentineltm', 'config', 'rules.json');
  const targetRulesPath = path.join(targetDir, 'rules.json');

  // Try to copy from rules.example.json first, then fallback to .sentineltm
  let sourceRulesPath = projectRulesPath;
  if (!fs.existsSync(projectRulesPath) && fs.existsSync(fallbackRulesPath)) {
    sourceRulesPath = fallbackRulesPath;
  }

  if (fs.existsSync(sourceRulesPath)) {
    // Copy existing rules
    try {
      fs.copyFileSync(sourceRulesPath, targetRulesPath);
      log.success(`  ✅ Copied rules.json to ${profileName}`);
    } catch (error) {
      log.warn(`  ⚠️ Could not copy rules.json: ${(error as Error).message}`);
    }
  } else {
    // Create default rules.json
    try {
      writeJsonFile(targetRulesPath, createDefaultRules());
      log.success(`  ✅ Created default rules.json in ${profileName}`);
    } catch (error) {
      log.warn(`  ⚠️ Could not create rules.json: ${(error as Error).message}`);
    }
  }

  if (applyRules) {
    // Copy to profiles directory
    const sentinelDir = path.join(process.cwd(), '.sentineltm');
    const profilesDir = path.join(sentinelDir, 'profiles', profileName);

    ensureDir(sentinelDir);
    ensureDir(profilesDir);

    const profileRulesPath = path.join(profilesDir, 'rules.json');
    try {
      if (fs.existsSync(sourceRulesPath)) {
        fs.copyFileSync(sourceRulesPath, profileRulesPath);
      } else {
        writeJsonFile(profileRulesPath, createDefaultRules());
      }
      log.success(`  ✅ Copied rules to profile: ${profileName}`);
    } catch (error) {
      log.warn(`  ⚠️ Could not copy to profile: ${(error as Error).message}`);
    }

    // Copy entire rules folder if it exists (for advanced configurations)
    const sourceRulesFolder = path.join(process.cwd(), '.windsurf', 'rules');
    const targetRulesFolder = path.join(targetDir, 'rules');
    
    if (fs.existsSync(sourceRulesFolder)) {
      try {
        // Copy entire rules folder
        copyFolderRecursive(sourceRulesFolder, targetRulesFolder);
        log.success(`  📁 Copied rules folder to ${profileName}`);
      } catch (error) {
        log.warn(`  ⚠️ Could not copy rules folder: ${(error as Error).message}`);
      }
    }
  }
};

const applyVsCode = (providerName: string, applyRules: boolean): void => {
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

  applyIdeProfile('VS Code', vscodeDir, providerName, applyRules);
};

const applyCursor = (providerName: string, applyRules: boolean): void => {
  const root = process.cwd();
  const cursorDir = path.join(root, '.cursor');
  applyIdeProfile('Cursor', cursorDir, providerName, applyRules);
};

const applyZed = (providerName: string, applyRules: boolean): void => {
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
  applyIdeProfile('Zed', zedDir, providerName, applyRules);
};

const applyWindsurf = (providerName: string, applyRules: boolean): void => {
  const root = process.cwd();
  const windsurfDir = path.join(root, '.windsurf');
  applyIdeProfile('Windsurf', windsurfDir, providerName, applyRules);
};

const applyProfile = (name: string, providerName: string, applyRules: boolean): void => {
  const root = process.cwd();
  const targetDir = path.join(root, `.${name.toLowerCase()}`);
  applyIdeProfile(name, targetDir, providerName, applyRules);
};

const ideTemplates: IdeTemplate[] = [
  { name: 'VS Code', apply: applyVsCode },
  { name: 'Cursor', apply: applyCursor },
  { name: 'Zed', apply: applyZed },
  { name: 'Windsurf', apply: applyWindsurf },
  { name: 'Trae', apply: (providerName: string, applyRules: boolean) => applyProfile('Trae', providerName, applyRules) },
  { name: 'Kiro', apply: (providerName: string, applyRules: boolean) => applyProfile('Kiro', providerName, applyRules) },
  { name: 'Continue', apply: (providerName: string, applyRules: boolean) => applyProfile('Continue', providerName, applyRules) },
  { name: 'Cline', apply: (providerName: string, applyRules: boolean) => applyProfile('Cline', providerName, applyRules) },
  { name: 'Codex', apply: (providerName: string, applyRules: boolean) => applyProfile('Codex', providerName, applyRules) },
  { name: 'Claude', apply: (providerName: string, applyRules: boolean) => applyProfile('Claude', providerName, applyRules) },
  { name: 'Gemini', apply: (providerName: string, applyRules: boolean) => applyProfile('Gemini', providerName, applyRules) },
  { name: 'OpenCode', apply: (providerName: string, applyRules: boolean) => applyProfile('OpenCode', providerName, applyRules) },
  { name: 'Roo', apply: (providerName: string, applyRules: boolean) => applyProfile('Roo', providerName, applyRules) },
  { name: 'Amp', apply: (providerName: string, applyRules: boolean) => applyProfile('Amp', providerName, applyRules) },
  { name: 'Kilo', apply: (providerName: string, applyRules: boolean) => applyProfile('Kilo', providerName, applyRules) },
];

export const getAvailableIdes = (): string[] => ideTemplates.map((t) => t.name);

export const setIde = (
  targets: string[],
  applyRules: boolean,
  providerName: string
): string[] => {
  
  const allTemplates = targets.length === 0 || targets.includes('all');
  const templatesToApply = allTemplates
    ? ideTemplates
    : ideTemplates.filter((t) =>
        targets.some((target) => t.name.toLowerCase() === target.toLowerCase())
      );

  templatesToApply.forEach((template) => {
    template.apply(providerName, applyRules);
  });

  return templatesToApply.map((t) => t.name);
};

export const applyIdeTargets = (targets: string[]): string[] => {
  log.warn('`applyIdeTargets` is deprecated. For interactive setup, use `st ide set`.');
  const config = configService.load();
  const providerName = config.defaults.provider || 'ollama';
  return setIde(targets, true, providerName);
};
