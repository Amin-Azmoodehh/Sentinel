import { Command } from 'commander';
import { pathSecurityService } from '../services/pathSecurityService.js';
import { log } from '../utils/logger.js';
import Table from 'cli-table3';

export const securityCommands = (program: Command) => {
  const security = program.command('security').description('🔒 Manage path whitelist/blacklist');

  security
    .command('whitelist')
    .description('Manage path whitelist')
    .option('-a, --add <path>', 'Add path to whitelist')
    .option('-l, --list', 'List whitelist')
    .action((options) => {
      if (options.add) {
        pathSecurityService.addWhitelist(options.add);
        log.success(`Added to whitelist: ${options.add}`);
      } else if (options.list) {
        const rules = pathSecurityService.getWhitelist();
        const table = new Table({ head: ['Pattern', 'Type'] });
        rules.forEach((r) => table.push([String(r.pattern), r.type]));
        console.log(table.toString());
      }
    });

  security
    .command('blacklist')
    .description('Manage path blacklist')
    .option('-a, --add <path>', 'Add path to blacklist')
    .option('-r, --reason <reason>', 'Reason for blacklisting')
    .option('-l, --list', 'List blacklist')
    .action((options) => {
      if (options.add) {
        pathSecurityService.addBlacklist(options.add, options.reason);
        log.success(`Added to blacklist: ${options.add}`);
      } else if (options.list) {
        const rules = pathSecurityService.getBlacklist();
        const table = new Table({ head: ['Pattern', 'Type', 'Reason'] });
        rules.forEach((r) => table.push([String(r.pattern), r.type, r.reason || '-']));
        console.log(table.toString());
      }
    });

  security
    .command('validate <path>')
    .description('Validate path security')
    .action((targetPath) => {
      const result = pathSecurityService.validatePath(targetPath);
      if (result.valid) {
        log.success(`Path is valid: ${targetPath}`);
      } else {
        log.error(`Path is invalid: ${result.reason}`);
      }
    });
};
