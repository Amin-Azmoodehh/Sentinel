import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { configService } from './configService.js';
import { log, type SummaryRow } from '../utils/logger.js';
import { ShellService } from './shellService.js';
import { indexingService } from './indexingService.js';
import { CompressionService } from './compressionService.js';
import { contextService } from './contextService.js';
import { generateCompletion } from './providerService.js';

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
    log.info(`Checking ${patterns.length} forbidden patterns: ${JSON.stringify(patterns)}`);
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return true;
    }
    const files = indexingService.getFiles();
    log.info(`Scanning ${files.length} files...`);
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

    const files = indexingService.getFiles();
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
    log.info('Starting Enhanced AI Rule Check...');
    const config = configService.load();
    const providerName = config.defaults.provider;
    const model = config.defaults.model;

    if (!providerName || !model) {
      log.error('❌ No provider or model configured!');
      log.warn('Please set a provider and model: st set provider <name> && st set model <model>');
      return false;
    }

    try {
      log.info('🧠 Enriching context for AI analysis...');
      
      // Use context service for intelligent analysis
      const context = await contextService.enrichContext({
        intent: 'code quality review and analysis',
        keywords: ['typescript', 'react', 'service', 'component', 'error', 'security'],
        fileTypes: ['.ts', '.tsx'],
        maxFiles: 3,
      });

      // Get git diff for recent changes (focus on changes, not entire codebase)
      let gitDiff = '';
      try {
        const { spawnSync } = await import('node:child_process');
        const result = spawnSync('git', ['diff', '--cached', 'HEAD~1..HEAD'], { 
          encoding: 'utf-8',
          cwd: process.cwd()
        });
        if (result.stdout) {
          gitDiff = result.stdout.slice(0, 1500); // Limit diff size
        }
      } catch {
        // Fallback to context-enriched file analysis
      }

      // If no git diff, use context-enriched analysis
      if (!gitDiff.trim()) {
        gitDiff = context.relevantFiles
          .map(file => `=== ${file.path} (${file.type}) ===\n${file.content.slice(0, 800)}`)
          .join('\n\n');
      }

      const prompt = [
        'You are a senior code reviewer with deep knowledge of this specific project.',
        'Analyze the provided code based on the established project patterns and rules.',
        'Return your feedback ONLY in the following JSON format. Do not add any other text.',
        '',
        '## PROJECT RULES & STANDARDS:',
        context.projectRules,
        '',
        '## ESTABLISHED PATTERNS TO FOLLOW:',
        ...context.patterns.map(pattern => `**${pattern.type}**: ${pattern.usage}`),
        '',
        '## PROJECT CONVENTIONS:',
        `Naming: ${context.conventions.naming.join(', ')}`,
        `Structure: ${context.conventions.structure.join(', ')}`,
        `Imports: ${context.conventions.imports.join(', ')}`,
        '',
        '## DEPENDENCIES IN USE:',
        ...context.dependencies.map(dep => `- ${dep.name} (${dep.version}): ${dep.usage.slice(0, 2).join(', ')}`),
        '',
        '## CODE TO REVIEW:',
        gitDiff || 'No code changes to analyze.',
        '',
        '## REQUIRED JSON OUTPUT FORMAT:',
        '{',
        '  "score": <integer from 0 to 100>,',
        '  "is_compliant": <true or false>,',
        '  "summary": "<brief overall assessment>",',
        '  "suggestions": [',
        '    {',
        '      "severity": "<critical|major|minor>",',
        '      "category": "<security|architecture|quality|style|patterns>",',
        '      "comment": "<specific improvement suggestion with reference to project patterns>"',
        '    }',
        '  ]',
        '}',
        '',
        'Focus on:',
        '1. Adherence to established project patterns',
        '2. Consistency with existing code conventions',
        '3. Proper use of project dependencies',
        '4. Security and quality best practices',
        'Be constructive and reference specific examples from the project context.',
      ].join('\n');

      log.info(`Sending contextual request to ${providerName} (${model})...`);
      const response = await generateCompletion({
        prompt,
        model,
        temperature: 0.1, // Low temperature for consistent structured output
        maxTokens: 1000, // More tokens for detailed feedback
      });

      const output = response.content.trim();
      
      // Try to parse JSON response
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const feedback = JSON.parse(jsonMatch[0]);
          const score = feedback.score || 0;
          
          log.info(`✅ AI Analysis Complete - Score: ${score}/100`);
          
          // Display detailed feedback
          if (feedback.summary) {
            log.info(`📋 Summary: ${feedback.summary}`);
          }
          
          if (feedback.suggestions && feedback.suggestions.length > 0) {
            log.info('💡 Suggestions:');
            feedback.suggestions.forEach((suggestion: any, index: number) => {
              const icon = suggestion.severity === 'critical' ? '🔴' : 
                          suggestion.severity === 'major' ? '🟡' : '🔵';
              log.info(`   ${icon} [${suggestion.category}] ${suggestion.comment}`);
            });
          }
          
          return score >= 85; // More reasonable threshold
        }
      } catch (parseError) {
        log.warn('⚠️ Could not parse structured feedback, falling back to simple scoring');
      }

      // Fallback: try to extract score from text
      const scoreMatch = output.match(/(?:score|rating).*?(\d+)/i);
      if (scoreMatch?.[1]) {
        const score = parseInt(scoreMatch[1], 10);
        log.info(`✅ AI model returned a score of: ${score}/100`);
        return score >= 85;
      }

      log.error('❌ Could not parse AI score from output!');
      log.warn('Expected format: "Final Score: XX/100"');
      if (output) {
        log.warn(`Received: ${output.substring(0, 200)}...`);
      }
      return false;
    } catch (error) {
      log.error('❌ Error during AI Rule Check!');
      
      // Enhanced error messaging
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('500') || errorMsg.includes('internal server error')) {
          log.error('🔴 AI Server Error (500): The AI model server encountered an internal error.');
          log.warn('Possible causes:');
          log.warn('  1. Model not fully loaded or corrupted');
          log.warn('  2. Insufficient server resources (RAM/VRAM)');
          log.warn('  3. Model incompatibility with current server version');
          log.warn(`\nTry: ollama pull ${model}  # Re-download the model`);
        } else if (errorMsg.includes('404')) {
          log.error('🔴 Model Not Found (404): The specified model does not exist.');
          log.warn(`Run: ollama list  # Check available models`);
          log.warn(`Or: ollama pull ${model}  # Download the model`);
        } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
          log.error('🔴 Authentication Error: Invalid API key or insufficient permissions.');
        } else {
          log.error(`Error: ${error.message}`);
        }
      }
      
      log.warn('\nTroubleshooting:');
      log.warn('  1. Check provider is configured: st provider status');
      log.warn('  2. Verify model exists: ollama list (for Ollama)');
      log.warn('  3. Check network connectivity');
      log.warn('  4. Try a different model: st set provider');
      
      return false;
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
