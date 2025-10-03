import { Command } from 'commander';
import { configService } from '../services/configService.js';
import { log } from '../utils/logger.js';

const parseValue = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
};

export const registerConfigCommands = (program: Command): void => {
  const configCommand = program.command('config').description('⚙️ Manage configuration settings');

  configCommand
    .command('get <key>')
    .description('Read value from config')
    .action((key: string) => {
      const value = configService.getValue(key);
      if (value === undefined) {
        log.warn('Key not found: ' + key);
        return;
      }
      process.stdout.write(JSON.stringify(value, null, 2) + '\n');
    });

  configCommand
    .command('set <key> <value>')
    .description('Set value in config (value parsed as JSON when possible)')
    .action((key: string, value: string) => {
      const parsed = parseValue(value);
      configService.setValue(key, parsed);
      log.success('Updated ' + key);
    });
};
