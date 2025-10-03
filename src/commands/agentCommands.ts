import { Command } from 'commander';
import { processThinkDepth } from '../services/thinkDepthService.js';
import { log } from '../utils/logger.js';

export const registerAgentCommands = (program: Command): void => {
  const agentCommand = program
    .command('agent')
    .description('🧠 AI agent planning and orchestration');

  agentCommand
    .command('plan')
    .description('Generate structured plan based on think_depth level')
    .requiredOption('-t, --task <task>', 'Task description')
    .option('-c, --context <context>', 'Project context')
    .option('-d, --depth <number>', 'Think depth level (0-10)', '3')
    .action((options: { task: string; context?: string; depth: string }) => {
      const response = processThinkDepth({
        task: options.task,
        context: options.context,
        think_depth: Number(options.depth),
      });
      log.raw(JSON.stringify(response, null, 2));
    });
};
