import { Command } from 'commander';
import chalk from 'chalk';
import { getSystemStatus, type SystemStatus } from '../services/statusService.js';

export const renderStatus = (status: SystemStatus): string => {
  const sections: string[] = [];

  // Header
  sections.push(chalk.bold.cyan('\n🚀 SentinelTM System Status'));
  sections.push(chalk.dim(`⏰ Updated: ${new Date(status.timestamp).toLocaleString()}`));
  sections.push('');

  // Provider Section
  const provider = status.provider;
  const activeFlag = provider.active?.available ? chalk.green('✓ Online') : chalk.red('✗ Offline');
  sections.push(chalk.bold.magenta('🤖 AI Provider'));
  sections.push(
    `   Default: ${chalk.cyan(provider.defaultProvider || 'none')} ${chalk.dim('(' + (provider.defaultModel || 'no model') + ')')}`
  );
  if (provider.active) {
    sections.push(`   Active:  ${chalk.cyan(provider.active.name)} ${activeFlag}`);
    if (provider.active.path) {
      sections.push(`   Path:    ${chalk.dim(provider.active.path)}`);
    }
  }
  const available = provider.detected.filter((p) => p.available);
  const unavailable = provider.detected.filter((p) => !p.available);
  if (available.length > 0) {
    sections.push(`   Ready:   ${available.map((p) => chalk.green(p.name)).join(', ')}`);
  }
  if (unavailable.length > 0) {
    sections.push(`   Failed:  ${unavailable.map((p) => chalk.red(p.name)).join(', ')}`);
  }
  sections.push('');

  // Gate Section
  sections.push(chalk.bold.yellow('🛡️  Quality Gate'));
  if (status.gate) {
    const gate = status.gate;
    const scoreColor = gate.success ? chalk.green : chalk.red;
    const statusIcon = gate.success ? '✓' : '✗';
    sections.push(`   Last Run: ${new Date(gate.timestamp).toLocaleString()}`);
    sections.push(
      `   Score:    ${scoreColor(gate.score ?? 'n/a')} / ${gate.threshold} ${scoreColor(statusIcon)}`
    );
    sections.push(`   Source:   ${gate.source}${gate.fallback ? chalk.yellow(' (fallback)') : ''}`);
    sections.push(`   Attempts: ${gate.attempts}`);
  } else {
    sections.push(chalk.dim('   No gate runs recorded yet'));
  }
  sections.push('');

  // Index Section
  sections.push(chalk.bold.blue('📚 Code Index'));
  sections.push(`   Files:    ${chalk.cyan(status.index.files.toLocaleString())}`);
  sections.push(`   Symbols:  ${chalk.cyan(status.index.symbols.toLocaleString())}`);
  sections.push(
    `   Updated:  ${status.index.lastRun ? new Date(status.index.lastRun).toLocaleString() : chalk.dim('never')}`
  );
  sections.push('');

  // Tasks Section
  sections.push(chalk.bold.green('📋 Task Management'));
  sections.push(`   Total:    ${chalk.cyan(status.tasks.total)}`);

  const statusEntries = Object.entries(status.tasks.byStatus).filter(([, value]) => value > 0);
  if (statusEntries.length > 0) {
    sections.push(
      `   Status:   ${statusEntries.map(([key, value]) => `${key}=${chalk.cyan(value)}`).join(', ')}`
    );
  }

  const priorityEntries = Object.entries(status.tasks.byPriority).filter(([, value]) => value > 0);
  if (priorityEntries.length > 0) {
    sections.push(
      `   Priority: ${priorityEntries.map(([key, value]) => `${key}=${chalk.cyan(value)}`).join(', ')}`
    );
  }

  sections.push(
    `   Updated:  ${status.tasks.lastUpdated ? new Date(status.tasks.lastUpdated).toLocaleString() : chalk.dim('never')}`
  );

  if (status.tasks.nextTask) {
    sections.push(
      `   Next:     ${chalk.yellow('#' + status.tasks.nextTask.id)} ${status.tasks.nextTask.title}`
    );
  }

  return sections.join('\n') + '\n';
};

export const outputStatus = (json: boolean | undefined, status: SystemStatus): void => {
  if (json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(status, null, 2));
  } else {
    // eslint-disable-next-line no-console
    console.log(renderStatus(status));
  }
};

export const registerStatusCommands = (program: Command): void => {
  program
    .command('status')
    .description('📊 Show complete system status')
    .option('--json', 'Output status in JSON format')
    .option('--watch [seconds]', 'Continuously refresh status output', (value) =>
      Number(value || '5')
    )
    .action(async (options: { json?: boolean; watch?: number }) => {
      const runOnce = async () => {
        const status = await getSystemStatus();
        outputStatus(options.json, status);
      };

      const runWithHandling = async () => {
        try {
          await runOnce();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.error(chalk.red('Failed to fetch status: ' + message));
        }
      };

      if (options.watch && Number.isFinite(options.watch) && options.watch > 0) {
        // eslint-disable-next-line no-console
        console.clear();
        await runWithHandling();
        const interval = Math.max(1, Math.floor(options.watch));
        const timer = setInterval(() => {
          // eslint-disable-next-line no-console
          console.clear();
          void runWithHandling();
        }, interval * 1000);

        const stop = () => {
          clearInterval(timer);
          process.exit();
        };
        process.on('SIGINT', stop);
        process.on('SIGTERM', stop);
      } else {
        await runWithHandling();
      }
    });
};
