import { Command } from 'commander';
import chalk from 'chalk';
import { runGate } from '../services/gateService.js';
import { renderTable } from '../utils/table.js';
import { log } from '../utils/logger.js';

const gateAction = async (min?: string): Promise<void> => {
  const minScore = min ? Number(min) : undefined;
  const result = await runGate(minScore);
  const rows = result.results.map((item) => [
    item.name,
    item.passed ? chalk.green('pass') : chalk.red('fail'),
    String(item.weight),
  ]);
  const table = renderTable({ head: ['Check', 'Result', 'Weight'], rows });
  log.raw(table);
  log.info('Score: ' + String(result.score) + ' / Threshold: ' + String(result.threshold));
  if (result.score < result.threshold) {
    process.exitCode = 1;
  }
};

export const registerGateCommands = (program: Command): void => {
  program
    .command('gate')
    .description('✅ Run quality checks and CI/CD gates')
    .option('--min <score>', 'Minimum passing score')
    .action(async (options: { min?: string }) => {
      await gateAction(options.min);
    });
};
