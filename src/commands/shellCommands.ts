import { Command } from 'commander';
import { ShellService } from '../services/shellService.js';
import { log } from '../utils/logger.js';

export const registerShellCommands = (program: Command): void => {
  const shellCommand = program.command('shell').description('🖥️ Execute shell commands safely');
  const shellService = ShellService.getInstance();

  shellCommand
    .command('run <command>')
    .description('Execute shell command')
    .option('--shell <shell>', 'Shell to use (powershell, cmd, bash, etc.)')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .action(async (command: string, options: { shell?: string; timeout?: string }) => {
      const result = await shellService.executeCommand(command, {
        shell: options.shell,
        timeout: options.timeout ? Number(options.timeout) : undefined,
      });

      if (result.stdout) {
        log.raw(result.stdout);
      }
      if (result.stderr) {
        log.error(result.stderr);
      }
      if (!result.success) {
        process.exit(result.exitCode ?? 1);
      }
    });

  shellCommand
    .command('detect')
    .description('Detect available shells')
    .action(() => {
      const info = shellService.getDefaultShellInfo();
      log.info('Platform: ' + info.platform);
      log.info('Default shell: ' + info.defaultShell);
      log.info('Available shells: ' + info.availableShells.join(', '));
    });

  shellCommand
    .command('list')
    .description('List allowed commands')
    .action(() => {
      const allowed = shellService.getAllowedCommands();
      if (allowed.length === 0) {
        log.info('All commands are allowed (no restrictions)');
      } else {
        log.info('Allowed commands:');
        allowed.forEach((cmd) => log.raw('  - ' + cmd));
      }
    });
};
