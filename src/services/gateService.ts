import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fg from 'fast-glob';
import { configService } from './configService.js';
import { log, type SummaryRow } from '../utils/logger.js';
import { ShellService } from './shellService.js';
import { detectProviders, normalizeProviderName } from './providerService.js';

interface GateCheck {
  name: string;
  weight: number;
  run: () => Promise<boolean> | boolean;
}

export interface GateRunMeta {
  timestamp: number;
  score: number | null;
  threshold: number;
  success: boolean;
  source: 'internal' | 'cli';
  attempts: number;
  fallback: boolean;
}

export interface GateResult {
  score: number;
  threshold: number;
  attempts: number;
  results: { name: string; passed: boolean; weight: number }[];
}

export interface CliGateResult {
  success: boolean;
  score: number | null;
  threshold: number;
  output: string;
  command: string;
  fallback: boolean;
  internalResult?: GateResult;
}

const recordGateRun = (meta: GateRunMeta): void => {
  configService.setValue('meta.gate.lastRun', meta);
};

const runCommand = (command: string, args: string[]): boolean => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ST_FORCE_STDERR: '1', ST_COMMAND: 'gate-runner' },
  });
  return result.status === 0;
};

const lintCheck: GateCheck = {
  name: 'Lint & Format',
  weight: 10,
  run: () => {
    log.section('Lint & Format');
    const lintResult = runCommand('npm', ['run', 'lint']);
    const formatResult = runCommand('npm', ['run', 'format']);
    return lintResult && formatResult;
  },
};

const testCheck: GateCheck = {
  name: 'Tests',
  weight: 10,
  run: () => {
    log.section('Tests');
    return runCommand('npm', ['run', 'test']);
  },
};

const buildCheck: GateCheck = {
  name: 'Build',
  weight: 10,
  run: () => {
    log.section('Build');
    return runCommand('npm', ['run', 'build']);
  },
};

const structureCheck: GateCheck = {
  name: 'Structure',
  weight: 10,
  run: () => {
    log.section('Structure');
    const config = configService.load();
    const required = config.security?.requiredRootDirs ?? ['src', '.sentineltm'];
    return required.every((item) => fs.existsSync(path.join(process.cwd(), item)));
  },
};

const securityCheck: GateCheck = {
  name: 'Security',
  weight: 10,
  run: () => {
    log.section('Security');
    const config = configService.load();
    const patterns = config.security?.forbidden ?? [];
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return true;
    }
    const files = fg.sync(['**/*.{ts,tsx,js,jsx,json}'], {
      cwd: process.cwd(),
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
    });
    for (const file of files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      for (const pattern of patterns) {
        if (content.includes(String(pattern))) {
          log.warn('Forbidden pattern found in ' + file + ': ' + pattern);
          return false;
        }
      }
    }
    return true;
  },
};

const hygieneCheck: GateCheck = {
  name: 'Hygiene',
  weight: 10,
  run: () => {
    log.section('Hygiene');
    const config = configService.load();
    const maxFileSize = (config.thresholds?.maxFileSizeMB ?? 5) * 1024 * 1024;
    const maxTodos = config.thresholds?.maxTodoCount ?? 10;

    const files = fg.sync(['**/*'], {
      cwd: process.cwd(),
      ignore: ['node_modules/**', 'dist/**', '.git/**', '.sentineltm/db/index.db'],
    });
    let todoCount = 0;
    for (const file of files) {
      const abs = path.join(process.cwd(), file);
      const stats = fs.statSync(abs);
      if (stats.isDirectory()) {
        continue;
      }
      if (stats.size > maxFileSize) {
        log.warn(`Large file detected (>${config.thresholds?.maxFileSizeMB ?? 5}MB): ${file}`);
        return false;
      }
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(abs, 'utf-8');
        todoCount += (content.match(/TODO/g) || []).length;
      }
    }
    if (todoCount > maxTodos) {
      log.warn(`Excessive TODO markers detected: ${todoCount} (max allowed: ${maxTodos})`);
      return false;
    }
    return true;
  },
};

const aiRuleCheck: GateCheck = {
  name: 'AI Rule Check',
  weight: 40,
  run: async () => {
    log.info('Starting AI Rule Check...');
    const shellService = ShellService.getInstance();
    const config = configService.load();
    const providerName = normalizeProviderName(config.defaults.provider || 'gemini-cli');

    const { providers } = detectProviders();
    const activeProvider = providers.find((p) => p.name === providerName && p.available);

    if (!activeProvider?.path) {
      log.warn(
        `AI provider '${providerName}' is not available or not found. Skipping AI Rule Check.`
      );
      return true;
    }

    const tempFilePath = path.join(
      os.tmpdir(),
      `sentinel-prompt-${crypto.randomBytes(6).toString('hex')}.txt`
    );

    try {
      const rulesPath = '.sentineltm/config/rules.json';
      const rules = fs.existsSync(rulesPath) 
        ? fs.readFileSync(rulesPath, 'utf-8')
        : 'No project rules defined';
      const sourceFiles = fg.sync('src/**/*.ts');
      const fileContents = sourceFiles
        .map((file) => `// --- ${file} ---\n${fs.readFileSync(file, 'utf-8')}`)
        .join('\n\n');

      const prompt = [
        'Please act as a code reviewer. Here are the rules:',
        '--- RULES ---',
        rules,
        '--- END RULES ---',
        '',
        'Here is the source code:',
        '--- SOURCE CODE ---',
        fileContents,
        '--- END SOURCE CODE ---',
        '',
        'Based on the rules, please provide a score from 0 to 100 for the provided source code.',
        'The final line of your output must be in the format "Final Score: XX/100".',
        '',
      ].join('\n');

      fs.writeFileSync(tempFilePath, prompt);

      log.info(`Sending request to ${providerName} using temp file...`);
      const promptContent = fs.readFileSync(tempFilePath, 'utf-8');
      const command = `"${activeProvider.path}" -p "${promptContent.replace(/"/g, '\\"')}"`;
      const result = await shellService.executeCommand(command, {
        isProviderCommand: true,
      });

      if (!result.success) {
        log.warn('AI provider execution failed, skipping AI Rule Check.');
        if (result.stderr) {
          log.warn(result.stderr);
        }
        return true;
      }

      const output = result.stdout;
      const scoreMatch = output.match(/Final Score: (\d+)\/100/);

      if (scoreMatch?.[1]) {
        const score = parseInt(scoreMatch[1], 10);
        log.info(`AI model returned a score of: ${score}`);
        return score >= 95;
      }

      log.warn('Could not parse score from AI provider output. Skipping AI Rule Check.');
      if (output) {
        log.warn(output);
      }
      return true;
    } catch (error) {
      log.warn('Error during AI Rule Check, skipping.');
      log.warn(error instanceof Error ? error.message : String(error));
      return true;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  },
};
const checks: GateCheck[] = [
  lintCheck,
  testCheck,
  buildCheck,
  structureCheck,
  securityCheck,
  hygieneCheck,
  aiRuleCheck,
];

export const runGate = async (minScore?: number): Promise<GateResult> => {
  const config = configService.load();
  const threshold = typeof minScore === 'number' ? minScore : Number(config.thresholds?.gate) || 95;
  const maxAttempts = 5;
  let attempts = 0;
  let score = 0;
  let results: { name: string; passed: boolean; weight: number }[] = [];

  if (!process.env.ST_COMMAND) {
    process.env.ST_COMMAND = 'gate-runner';
  }

  log.banner('SentinelTM Gatekeeper', `Threshold ${threshold}/100`, 'info');

  while (attempts < maxAttempts) {
    attempts++;
    score = 0;
    results = [];

    log.attempt(attempts, maxAttempts);

    for (const check of checks) {
      const passed = await check.run();
      if (passed) {
        score += check.weight;
      }
      results.push({ name: check.name, passed, weight: check.weight });
    }

    const snapshotRows: SummaryRow[] = results.map((item) => ({
      label: `${item.name}`,
      value: `${item.weight} pts`,
      status: item.passed ? 'success' : 'fail',
    }));
    snapshotRows.push({
      label: 'Score',
      value: `${score}/100`,
      status: score >= threshold ? 'success' : 'fail',
    });

    log.summary('Gate Snapshot', snapshotRows);

    if (score >= threshold) {
      log.banner('Gate Cleared', `Score ${score}/${100}`, 'success');
      recordGateRun({
        timestamp: Date.now(),
        score,
        threshold,
        success: true,
        source: 'internal',
        attempts,
        fallback: false,
      });
      return { score, threshold, attempts, results };
    }

    if (attempts < maxAttempts) {
      log.banner('Retry Needed', `Score ${score}/${100}`, 'warn');
    }
  }

  log.banner('Gate Failed', `Final Score ${score}/${100}`, 'fail');
  recordGateRun({
    timestamp: Date.now(),
    score,
    threshold,
    success: false,
    source: 'internal',
    attempts,
    fallback: false,
  });
  return { score, threshold, attempts, results };
};

const extractScore = (output: string): number | null => {
  const scoreMatch = output.match(/Score:\s*(\d+)/i);
  if (scoreMatch) {
    return Number(scoreMatch[1]);
  }
  const finalMatch = output.match(/Final\s*Score:\s*(\d+)\s*\/\s*100/i);
  if (finalMatch) {
    return Number(finalMatch[1]);
  }
  return null;
};

export const runGateViaCli = async (minScore = 95): Promise<CliGateResult> => {
  const shellService = ShellService.getInstance();
  const allowed = [...shellService.getAllowedCommands(), 'st', 'npm'];
  const command = `st gate run --min ${minScore}`;
  const result = await shellService.executeCommand(command, {
    allowedCommands: allowed,
    timeout: 120000,
  });

  const output = (result.stdout || '') + (result.stderr ? `\r\n${result.stderr}` : '');
  const score = result.success ? extractScore(output) : null;
  if (result.success && typeof score === 'number' && score >= minScore) {
    recordGateRun({
      timestamp: Date.now(),
      score,
      threshold: minScore,
      success: true,
      source: 'cli',
      attempts: 1,
      fallback: false,
    });
    return {
      success: true,
      score,
      threshold: minScore,
      output,
      command,
      fallback: false,
    };
  }

  const internal = await runGate(minScore);
  recordGateRun({
    timestamp: Date.now(),
    score: internal.score,
    threshold: internal.threshold,
    success: internal.score >= internal.threshold,
    source: 'cli',
    attempts: internal.attempts,
    fallback: true,
  });
  return {
    success: internal.score >= internal.threshold,
    score: internal.score,
    threshold: internal.threshold,
    output,
    command,
    fallback: true,
    internalResult: internal,
  };
};
