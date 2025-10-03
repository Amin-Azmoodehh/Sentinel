import { Command } from 'commander';
import chalk from 'chalk';
import { detectProviders } from '../services/providerService.js';
import { indexProject } from '../services/indexService.js';
import { runGate } from '../services/gateService.js';
import { getSystemStatus } from '../services/statusService.js';
import { renderStatus } from './statusCommands.js';

export const registerOrchestratorCommands = (program: Command): void => {
  const orchestrator = program
    .command('orchestrator')
    .description('🎼 Run orchestration pipelines');

  orchestrator
    .command('run')
    .description('Run a lightweight orchestration pipeline (providers, index, gate, status)')
    .option('--min <score>', 'Minimum gate score', (value) => Number(value))
    .option('--skip-index', 'Skip index refresh step')
    .action(async (options: { min?: number; skipIndex?: boolean }) => {
      const detection = detectProviders();
      const availableCount = detection.providers.filter((p) => p.available).length;
      // eslint-disable-next-line no-console
      console.log(chalk.bold('Provider detection'));
      detection.providers.forEach((provider) => {
        const status = provider.available ? chalk.green('ok') : chalk.red('fail');
        const pathInfo = provider.path ?? 'n/a';
        // eslint-disable-next-line no-console
        console.log(`  ${provider.name} -> ${pathInfo} [${status}]`);
      });
      // eslint-disable-next-line no-console
      console.log(chalk.dim(`  available: ${availableCount}/${detection.providers.length}`));
      // eslint-disable-next-line no-console
      console.log('');

      if (!options.skipIndex) {
        // eslint-disable-next-line no-console
        console.log(chalk.bold('Refreshing index...'));
        indexProject(process.cwd());
        // eslint-disable-next-line no-console
        console.log(chalk.green('Index refresh complete.'));
        // eslint-disable-next-line no-console
        console.log('');
      }

      // eslint-disable-next-line no-console
      console.log(chalk.bold('Running gate checks...'));
      const gateResult = await runGate(options.min);
      const gateStatus =
        gateResult.score >= gateResult.threshold ? chalk.green('pass') : chalk.red('fail');
      // eslint-disable-next-line no-console
      console.log(
        `  score: ${gateResult.score}/${gateResult.threshold} (${gateStatus}) after ${gateResult.attempts} attempt(s)`
      );
      // eslint-disable-next-line no-console
      console.log('');

      const status = await getSystemStatus();
      // eslint-disable-next-line no-console
      console.log(renderStatus(status));
    });
};
