import { Command } from 'commander';
import { applyIdeTargets } from '../services/ideService.js';
import { log } from '../utils/logger.js';

export const registerIdeCommands = (program: Command): void => {
  const runIdeSet = (targetsArg?: string) => {
    const targets = targetsArg
      ? targetsArg
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    if (targets.length === 0) {
      log.info('No targets specified, configuring all IDE profiles...');
    } else {
      log.info(`Configuring IDE profiles: ${targets.join(', ')}`);
    }

    const applied = applyIdeTargets(targets);

    if (applied.length === 0) {
      log.warn('No IDE profiles were configured!');
      return;
    }

    log.raw('\n🎯 IDE Configuration Complete');
    applied.forEach((name) => {
      log.success(`${name} → MCP profile ready`);
    });

    log.info(`\n📁 Generated ${applied.length} IDE configuration${applied.length > 1 ? 's' : ''}`);
  };

  const ide = program.command('ide').description('💻 Configure IDE MCP integration');

  ide
    .command('set')
    .description('Configure IDE profiles for MCP integration')
    .argument(
      '[targets]',
      'Comma separated IDE names (VS Code, Cursor, Zed, Windsurf, Trae) or "all"'
    )
    .action((targetsArg?: string) => runIdeSet(targetsArg));

  ide
    .command('list')
    .description('List available IDE targets')
    .action(() => {
      log.raw('\n💻 Available IDE Targets');
      const ides = ['VS Code', 'Cursor', 'Zed', 'Windsurf', 'Trae'];
      ides.forEach((name) => {
        log.info(`• ${name}`);
      });
      log.raw('\n💡 Usage: st ide set "VS Code,Cursor" or st ide set all');
    });

  let legacySetCommand = program.commands.find((cmd) => cmd.name() === 'set');
  if (!legacySetCommand) {
    legacySetCommand = program.command('set').description('⚙️ Quick configuration shortcuts');
  }

  legacySetCommand
    .command('ide [targets]')
    .description('Alias of "st ide set" for backward compatibility')
    .action((targetsArg?: string) => runIdeSet(targetsArg));
};
