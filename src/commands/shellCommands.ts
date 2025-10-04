import { Command } from 'commander';
import { ShellService } from '../services/shellService.js';
import { scriptsService } from '../services/scriptsService.js';
import { log } from '../utils/logger.js';
import { renderTable } from '../utils/table.js';

export const registerShellCommands = (program: Command): void => {
  const shellCommand = program.command('shell').description('🖥️ Execute shell commands and named scripts');
  const shellService = ShellService.getInstance();

  shellCommand
    .command('run <command>')
    .alias('exec')
    .alias('execute')
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

  // Named Scripts Commands
  shellCommand
    .command('exec <script>')
    .description('Execute a named script')
    .option('--force', 'Skip confirmation prompts')
    .action(async (scriptName: string, options: { force?: boolean }, ...args: string[]) => {
      const success = await scriptsService.executeScript(scriptName, {
        args: args,
        skipConfirmation: options.force,
      });
      
      if (!success) {
        process.exit(1);
      }
    });

  shellCommand
    .command('scripts')
    .description('List all available named scripts')
    .action(() => {
      const scripts = scriptsService.listScripts();
      
      if (scripts.length === 0) {
        log.info('No scripts configured. Add scripts to .sentineltm/config/scripts.yml');
        return;
      }

      const rows = scripts.map(name => {
        const script = scriptsService.getScript(name);
        const description = Array.isArray(script) 
          ? `${script.length} commands` 
          : script?.substring(0, 50) + (script && script.length > 50 ? '...' : '');
        return [name, description || ''];
      });

      const table = renderTable({
        head: ['Script Name', 'Description'],
        rows,
      });

      log.raw('\n📜 Available Named Scripts:');
      log.raw(table);
      log.info('\nUsage: st shell exec <script-name> [args...]');
    });

  shellCommand
    .command('add <name> <command>')
    .description('Add a new named script')
    .action((name: string, command: string) => {
      const success = scriptsService.addScript(name, command);
      if (!success) {
        process.exit(1);
      }
    });

  shellCommand
    .command('remove <name>')
    .description('Remove a named script')
    .action((name: string) => {
      const success = scriptsService.removeScript(name);
      if (!success) {
        process.exit(1);
      }
    });
};
