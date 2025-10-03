import { Command } from 'commander';
import path from 'node:path';
import dayjs from 'dayjs';
import { indexProject, indexStatus, searchIndex } from '../services/indexService.js';
import { renderTable } from '../utils/table.js';
import { log } from '../utils/logger.js';

export const registerIndexCommands = (program: Command): void => {
  const indexCommand = program.command('index').description('🔍 Index and search your codebase');

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
      const status = indexStatus();
      const timestamp = status.lastRun
        ? dayjs(status.lastRun).format('YYYY-MM-DD HH:mm:ss')
        : 'never';
      const table = renderTable({
        head: ['Metric', 'Value'],
        rows: [
          ['Files', String(status.files)],
          ['Symbols', String(status.symbols)],
          ['Last Run', timestamp],
        ],
      });
      log.raw(table);
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
