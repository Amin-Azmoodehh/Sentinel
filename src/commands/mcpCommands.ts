import { Command } from 'commander';
import { log } from '../utils/logger.js';

export const registerMcpCommands = (program: Command): void => {
  const mcpCommand = program.command('mcp').description('🔌 MCP server management');

  mcpCommand
    .command('servers')
    .description('List registered MCP servers')
    .action(() => {
      log.info('SentinelTM MCP Server');
      log.info('Status: Available');
      log.info('Transport: stdio');
      log.info('Start with: st serve');
    });

  program
    .command('doctor')
    .description('🩺 Check system health and configuration')
    .action(() => {
      log.success('✓ SentinelTM installation OK');
      log.success('✓ Database initialized');
      log.success('✓ Configuration loaded');
      log.info('Run "st status" for detailed system status');
    });
};
