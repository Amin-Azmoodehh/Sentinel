import { Command } from 'commander';
import { advancedIndexService } from '../services/advancedIndexService.js';
import { log } from '../utils/logger.js';

export const advancedIndexCommands = (program: Command) => {
  // Find existing index command instead of creating a new one
  let index = program.commands.find((cmd) => cmd.name() === 'index');
  if (!index) {
    index = program.command('index').description('🔍 Index and search your codebase');
  }

  index
    .command('advanced')
    .description('Advanced indexing with filters')
    .option('-r, --root <path>', 'Root directory')
    .option('-e, --exclude <patterns>', 'Exclude patterns (comma-separated)')
    .option('-i, --include <patterns>', 'Include patterns (comma-separated)')
    .option('-s, --max-size <bytes>', 'Max file size in bytes')
    .option('-x, --external <paths>', 'External projects (comma-separated)')
    .option('--follow-symlinks', 'Follow symbolic links')
    .action(async (options) => {
      log.info('Starting advanced indexing...');

      const indexOptions = {
        root: options.root,
        exclude: options.exclude?.split(','),
        include: options.include?.split(','),
        maxFileSize: options.maxSize ? parseInt(options.maxSize) : undefined,
        externalProjects: options.external?.split(','),
        followSymlinks: options.followSymlinks,
      };

      const stats = await advancedIndexService.indexWithOptions(indexOptions);

      console.log('\n📊 Indexing Results\n');
      console.log(`Files Indexed: ${stats.filesIndexed}`);
      console.log(`Files Skipped: ${stats.filesSkipped}`);
      console.log(`Total Size: ${Math.round(stats.totalSize / 1024)}KB`);
      console.log(`Duration: ${stats.duration}ms`);

      if (stats.errors.length > 0) {
        console.log('\n⚠️  Errors:');
        stats.errors.forEach((err) => console.log(`  - ${err}`));
      }
    });

  index
    .command('search-advanced')
    .description('Search with advanced filters')
    .argument('<query>', 'Search query')
    .option('-t, --types <extensions>', 'File types (comma-separated)')
    .option('-e, --exclude <paths>', 'Exclude paths (comma-separated)')
    .option('-m, --max <count>', 'Max results', '50')
    .action(async (query, options) => {
      const filters = {
        fileTypes: options.types?.split(','),
        excludePaths: options.exclude?.split(','),
        maxResults: parseInt(options.max),
      };

      const results = await advancedIndexService.searchWithFilters(query, filters);

      console.log(`\n🔍 Found ${results.length} results\n`);
      results.forEach((r) => {
        const location = r.line ? `${r.file}:${r.line}` : r.file;
        console.log(`  ${location}`);
        console.log(`    ${r.content}`);
      });
    });

  index
    .command('clear-cache')
    .description('Clear index cache')
    .action(() => {
      advancedIndexService.clearCache();
      log.success('Index cache cleared');
    });
};
