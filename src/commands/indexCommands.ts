import { Command } from 'commander';
import path from 'node:path';
import dayjs from 'dayjs';
import { indexProject, indexStatus, searchIndex } from '../services/indexService.js';
import { indexingService } from '../services/indexingService.js';
import { renderTable } from '../utils/table.js';
import { log } from '../utils/logger.js';

export const registerIndexCommands = (program: Command): void => {
  const indexCommand = program.command('index').description('🔍 Index and search your codebase');

  indexCommand
    .command('build')
    .description('Build persistent project index')
    .action(() => {
      indexingService.buildIndex();
    });

  indexCommand
    .command('run')
    .description('Build project search index')
    .option('--root <path>', 'Root directory to index', 'src')
    .action((options) => {
      const rootPath = path.resolve(process.cwd(), options.root);
      indexProject(rootPath);
      log.success('Index updated.');
    });

  indexCommand
    .command('status')
    .description('Show index statistics')
    .action(() => {
      // Get both old and new index status
      const oldStatus = indexStatus();
      const newStatus = indexingService.getIndexStatus();
      
      const oldTimestamp = oldStatus.lastRun
        ? dayjs(oldStatus.lastRun).format('YYYY-MM-DD HH:mm:ss')
        : 'never';
      
      const newTimestamp = newStatus.lastUpdated
        ? dayjs(newStatus.lastUpdated).format('YYYY-MM-DD HH:mm:ss')
        : 'never';
      
      const table = renderTable({
        head: ['Index Type', 'Files', 'Last Updated'],
        rows: [
          ['Search Index (legacy)', String(oldStatus.files), oldTimestamp],
          ['Project Index (new)', String(newStatus.files), newTimestamp],
        ],
      });
      log.raw('\n📊 Index Status');
      log.raw(table);
      
      if (newStatus.files === 0) {
        log.warn('\n⚠️ No files in project index. Run `st index build` to build it.');
      } else {
        log.success(`\n✅ Project index contains ${newStatus.files} files`);
      }
    });

  indexCommand
    .command('search <query>')
    .description('Search indexed code')
    .action((query: string) => {
      const results = searchIndex(query);
      if (results.length === 0) {
        log.info('No results found.');
        return;
      }
      const table = renderTable({
        head: ['File', 'Line', 'Match'],
        rows: results.map((r) => [r.file, String(r.line || '-'), r.content.substring(0, 60)]),
      });
      log.raw(table);
    });
};
