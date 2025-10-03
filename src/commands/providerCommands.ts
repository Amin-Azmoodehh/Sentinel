import { Command } from 'commander';
import {
  setProvider,
  detectModels,
  listModels,
  setModel,
  statusModels,
} from '../services/providerService.js';

export const registerProviderCommands = (program: Command) => {
  // Create provider command with subcommands
  const providerCommand = new Command('provider');
  providerCommand.description('🤖 Manage AI providers (Gemini, Qwen, Ollama, Codex)');

  providerCommand
    .command('set <provider>')
    .description('Set the default provider')
    .action(async (provider) => {
      await setProvider(provider);
    });

  providerCommand
    .command('detect')
    .description('Detect available models')
    .action(async () => {
      await detectModels();
    });

  providerCommand
    .command('list [provider]')
    .description('List models for a provider')
    .option('--json', 'Output in JSON format')
    .action(async (provider, _options) => {
      await listModels(provider);
    });

  providerCommand
    .command('set-model <provider> <model>')
    .description('Set the default model for a provider')
    .action(async (provider, model) => {
      await setModel(`${provider} ${model}`);
    });

  providerCommand
    .command('status')
    .description('Show current provider and model status')
    .action(async () => {
      await statusModels();
    });

  program.addCommand(providerCommand);

  // Keep backward compatibility with direct commands
  let legacySetCommand = program.commands.find((cmd) => cmd.name() === 'set');
  if (!legacySetCommand) {
    legacySetCommand = program.command('set').description('⚙️ Quick configuration shortcuts');
  }

  legacySetCommand
    .command('provider <provider>')
    .description('Set the default provider')
    .action(async (provider) => {
      await setProvider(provider);
    });

  program
    .command('models detect')
    .description('Detect available models')
    .action(async () => {
      await detectModels();
    });

  program
    .command('models list [provider]')
    .description('List models for a provider')
    .option('--json', 'Output in JSON format')
    .action(async (_literal, provider, _options) => {
      await listModels(provider);
    });

  program
    .command('models set <provider> <model>')
    .description('Set the default model for a provider')
    .action(async (_literal, provider, model) => {
      await setModel(`${provider} ${model}`);
    });

  program
    .command('models status')
    .description('Show current provider and model status')
    .action(async () => {
      await statusModels();
    });
};
