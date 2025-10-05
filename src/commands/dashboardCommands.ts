import { Command } from 'commander';
import { dashboardService } from '../services/dashboardService.js';
import { log } from '../utils/logger.js';
import Table from 'cli-table3';
import fs from 'node:fs';
import path from 'node:path';

export const dashboardCommands = (program: Command) => {
  const dashboard = program
    .command('dashboard')
    .alias('dash')
    .description('📊 Project metrics and monitoring');

  dashboard
    .command('show')
    .description('Show dashboard metrics')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      const metrics = await dashboardService.getMetrics();

      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
        return;
      }

      console.log('\n📊 SentinelTM Dashboard\n');

      const projectTable = new Table({ head: ['Project Info', 'Value'] });
      projectTable.push(['Name', metrics.project.name]);
      projectTable.push(['Root', metrics.project.root]);
      projectTable.push(['Files Indexed', String(metrics.project.filesIndexed)]);
      projectTable.push(['Symbols', String(metrics.project.symbolsIndexed)]);
      console.log(projectTable.toString());

      const tasksTable = new Table({ head: ['Tasks', 'Count'] });
      tasksTable.push(['Total', String(metrics.tasks.total)]);
      tasksTable.push(['Pending', String(metrics.tasks.pending)]);
      tasksTable.push(['In Progress', String(metrics.tasks.inProgress)]);
      tasksTable.push(['Completed', String(metrics.tasks.completed)]);
      tasksTable.push(['Blocked', String(metrics.tasks.blocked)]);
      console.log('\n' + tasksTable.toString());

      const qualityTable = new Table({ head: ['Quality', 'Value'] });
      qualityTable.push(['Score', `${metrics.quality.lastScore}/${metrics.quality.threshold}`]);
      qualityTable.push(['Status', metrics.quality.passing ? '✅ PASSING' : '❌ FAILING']);
      console.log('\n' + qualityTable.toString());

      const systemTable = new Table({ head: ['System', 'Value'] });
      systemTable.push(['Platform', metrics.system.platform]);
      systemTable.push([
        'Memory',
        `${metrics.system.memory.used}MB / ${metrics.system.memory.total}MB`,
      ]);
      systemTable.push(['Usage', `${metrics.system.memory.percentage}%`]);
      console.log('\n' + systemTable.toString());
    });

  dashboard
    .command('report')
    .description('Generate dashboard report')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options) => {
      const report = await dashboardService.generateReport();

      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, report);
        log.success(`Report saved: ${outputPath}`);
      } else {
        console.log(report);
      }
    });
};
