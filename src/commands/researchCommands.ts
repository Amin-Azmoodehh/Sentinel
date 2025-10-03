import { Command } from 'commander';
import { runResearch } from '../services/researchService.js';
import { log } from '../utils/logger.js';

export const registerResearchCommand = (program: Command): void => {
  program
    .command('research <prompt>')
    .description('🔬 Send research query to AI provider')
    .action((prompt: string) => {
      const response = runResearch(prompt);
      log.info('Response:');
      process.stdout.write(response + '\n');
    });
};
