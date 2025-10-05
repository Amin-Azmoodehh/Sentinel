import { Command } from 'commander';
import {
  listFiles,
  movePath,
  copyPath,
  removePath,
  splitLargeFile,
  createDirectories,
  readFileContent,
  writeFileContent,
} from '../services/fsService.js';
import { renderTable } from '../utils/table.js';
import { log } from '../utils/logger.js';

export const registerFsCommands = (program: Command): void => {
  const fsCommand = program
    .command('fs')
    .description('📁 Secure file operations (read/write/move/copy)');

  fsCommand
    .command('ls [pattern]')
    .alias('list')
    .description('List files optionally by glob pattern')
    .action(async (pattern?: string) => {
      const files = await listFiles(pattern);
      const rows = files.map((file) => [file]);
      const table = renderTable({ head: ['Path'], rows });
      log.raw(table);
    });

  fsCommand
    .command('mv <source> <destination>')
    .description('Move files or directories')
    .action(async (source: string, destination: string) => {
      await movePath(source, destination);
      log.success('Moved ' + source + ' -> ' + destination);
    });

  fsCommand
    .command('cp <source> <destination>')
    .alias('copy')
    .description('Copy files or directories')
    .action(async (source: string, destination: string) => {
      await copyPath(source, destination);
      log.success('Copied ' + source + ' -> ' + destination);
    });

  fsCommand
    .command('rm <target>')
    .alias('delete')
    .description('Remove files or directories')
    .option('--force', 'Ignore missing files')
    .action(async (target: string, options: { force?: boolean }) => {
      await removePath(target, Boolean(options.force));
      log.success('Removed ' + target);
    });

  fsCommand
    .command('split <file>')
    .description('Split large file into parts')
    .option('--max <lines>', 'Maximum lines per file', '300')
    .action((file: string, options: { max?: string }) => {
      const limit = options.max ? Number(options.max) : 300;
      const summary = splitLargeFile(file, limit);
      if (!summary) {
        log.info('No split required.');
        return;
      }
      const rows = summary.parts.map((part) => [part]);
      const table = renderTable({ head: ['Created modules'], rows });
      log.raw(table);
    });

  fsCommand
    .command('mkdir <paths>')
    .description('Create directories (comma-separated for multiple)')
    .action(async (paths: string) => {
      const pathList = paths.split(',').map((p) => p.trim());
      const result = await createDirectories(pathList);
      result.created.forEach((p) => log.success('Created: ' + p));
      result.skipped.forEach((p) => log.info('Already exists: ' + p));
    });

  fsCommand
    .command('read <file>')
    .description('Read file content')
    .option('--encoding <enc>', 'File encoding', 'utf8')
    .option('--max <bytes>', 'Maximum bytes to read')
    .action((file: string, options: { encoding?: string; max?: string }) => {
      const result = readFileContent(file, {
        encoding: options.encoding as BufferEncoding,
        maxBytes: options.max ? Number(options.max) : undefined,
      });
      log.raw(result.content);
    });

  fsCommand
    .command('write <file> <content>')
    .description('Write content to file')
    .option('--encoding <enc>', 'File encoding', 'utf8')
    .option('--append', 'Append instead of overwrite')
    .action((file: string, content: string, options: { encoding?: string; append?: boolean }) => {
      const result = writeFileContent(file, content, {
        encoding: options.encoding as BufferEncoding,
        mode: options.append ? 'append' : 'overwrite',
      });
      log.success(
        (result.created ? 'Created' : result.mode === 'append' ? 'Appended' : 'Wrote') +
          ' ' +
          result.bytesWritten +
          ' bytes to ' +
          file
      );
    });
};
