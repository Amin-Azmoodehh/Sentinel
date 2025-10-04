import { Command } from 'commander';
import { contextMonitorService } from '../services/contextMonitorService.js';
import { friendlyService } from '../services/friendlyService.js';
import { log } from '../utils/logger.js';
import { renderTable } from '../utils/table.js';

export const registerMonitorCommands = (program: Command): void => {
  const monitorCommand = program
    .command('monitor')
    .alias('mon')
    .description('🎟️ Context window and session monitoring');

  // Show current stats
  monitorCommand
    .command('stats')
    .description('Show context window usage statistics')
    .action(() => {
      const stats = contextMonitorService.getStats();
      const userName = friendlyService.getUserName();

      log.raw(`\n📊 Context Window Monitor - ${userName}\n`);

      const table = renderTable({
        head: ['Metric', 'Value'],
        rows: [
          ['Model Context Window', stats.modelContextWindow.toLocaleString() + ' tokens'],
          ['Current Session Usage', stats.currentSessionTokens.toLocaleString() + ' tokens'],
          ['Usage Percentage', `${stats.usagePercentage}%`],
          ['Estimated Remaining Turns', stats.estimatedRemainingTurns.toString()],
          ['Status', 
            stats.warningLevel === 'safe' ? '✅ Safe' :
            stats.warningLevel === 'warning' ? '⚠️ Warning' :
            '🚨 Critical'
          ],
        ],
      });

      log.raw(table);

      // Show warning message if any
      const warning = contextMonitorService.getWarningMessage();
      if (warning) {
        log.warn(`\n${warning}`);
      } else {
        log.success('\n✅ Context window usage is healthy!');
      }
    });

  // Show session summary
  monitorCommand
    .command('summary')
    .description('Show detailed session summary')
    .action(() => {
      const summary = contextMonitorService.getSessionSummary();
      log.raw(`\n${summary}\n`);
    });

  // Show recent operations
  monitorCommand
    .command('recent')
    .description('Show recent operations with token usage')
    .option('--count <n>', 'Number of recent operations to show', '10')
    .action((options: { count: string }) => {
      const count = parseInt(options.count);
      const operations = contextMonitorService.getRecentOperations(count);

      if (operations.length === 0) {
        log.info('No operations recorded yet.');
        return;
      }

      const rows = operations.map(op => [
        new Date(op.timestamp).toLocaleTimeString(),
        op.operation,
        op.inputTokens.toLocaleString(),
        op.outputTokens.toLocaleString(),
        op.totalTokens.toLocaleString(),
      ]);

      const table = renderTable({
        head: ['Time', 'Operation', 'Input', 'Output', 'Total'],
        rows,
      });

      log.raw(`\n📝 Recent Operations (Last ${operations.length}):\n`);
      log.raw(table);
    });

  // Reset session
  monitorCommand
    .command('reset')
    .description('Reset context monitoring session')
    .action(() => {
      contextMonitorService.resetSession();
      log.success('✅ Context monitoring session has been reset.');
    });

  // Export stats
  monitorCommand
    .command('export')
    .description('Export monitoring statistics to JSON')
    .option('-o, --output <file>', 'Output file path')
    .action((options: { output?: string }) => {
      const stats = contextMonitorService.exportStats();
      
      if (options.output) {
        const fs = require('node:fs');
        fs.writeFileSync(options.output, stats);
        log.success(`✅ Stats exported to ${options.output}`);
      } else {
        log.raw(stats);
      }
    });

  // Friendly aliases command
  const aliasCommand = program
    .command('alias')
    .description('🎯 Manage friendly command aliases');

  aliasCommand
    .command('list')
    .description('List all available aliases')
    .action(() => {
      const aliases = friendlyService.listAliases();

      if (aliases.length === 0) {
        log.info('No aliases configured. Add aliases to friendly.yml');
        return;
      }

      const rows = aliases.map(a => [a.alias, a.command]);

      const table = renderTable({
        head: ['Alias', 'Command'],
        rows,
      });

      log.raw(`\n🎯 Friendly Aliases:\n`);
      log.raw(table);
      log.info('\nUsage: Just type the alias name directly (e.g., "وضعیت" instead of "st status")');
    });

  aliasCommand
    .command('translate <input>')
    .description('Translate alias to actual command')
    .action((input: string) => {
      const translated = friendlyService.translateAlias(input);
      
      if (translated === input) {
        log.info(`No alias found for "${input}"`);
      } else {
        log.success(`Translated: ${input} → ${translated}`);
      }
    });

  // Friendly greetings
  const friendlyCommand = program
    .command('friendly')
    .description('🤝 Friendly interaction commands');

  friendlyCommand
    .command('greet')
    .description('Get a friendly greeting')
    .action(() => {
      const greeting = friendlyService.getGreeting();
      log.raw(`\n${greeting}\n`);
    });

  friendlyCommand
    .command('preferences')
    .description('Show your preferences')
    .action(() => {
      const userName = friendlyService.getUserName();
      log.info(`User: ${userName}`);
      
      const componentPath = friendlyService.getPreference('default_component_path');
      const testCommand = friendlyService.getPreference('default_test_command');
      const minScore = friendlyService.getPreference('min_quality_score');

      log.info(`Default Component Path: ${componentPath || 'Not set'}`);
      log.info(`Default Test Command: ${testCommand || 'Not set'}`);
      log.info(`Min Quality Score: ${minScore || 'Not set'}`);
    });

  friendlyCommand
    .command('workflows')
    .description('List common workflows')
    .action(() => {
      const config = friendlyService['config'];
      if (!config || !config.context_awareness.common_workflows) {
        log.info('No workflows configured.');
        return;
      }

      log.raw('\n🔄 Common Workflows:\n');
      config.context_awareness.common_workflows.forEach(workflow => {
        log.info(`\n${workflow.name}:`);
        workflow.steps.forEach((step, i) => {
          log.info(`  ${i + 1}. ${step}`);
        });
      });
    });
};
