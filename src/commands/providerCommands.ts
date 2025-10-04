import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  setProvider,
  detectModels,
  listModels,
  setModel,
  statusModels,
  upsertProviderConfig,
} from '../services/providerService.js';

export const registerProviderCommands = (program: Command) => {
  // Create provider command with subcommands
  const providerCommand = new Command('provider');
  providerCommand.description('🤖 Manage AI providers via API (Ollama, OpenAI, Claude, Gemini)');

  providerCommand
    .command('set <provider>')
    .description('Set and configure an AI provider')
    .option('--type <type>', 'Provider type (e.g., ollama, openai-compatible)')
    .option('--base-url <url>', 'API endpoint base URL')
    .option('--api-key <key>', 'Your secret API key')
    .option('--model <id>', 'Default model ID for this provider')
    .action((provider, options) => {
      // First, create or update the provider's configuration
      upsertProviderConfig(provider, options);
      // Then, set it as the default
      setProvider(provider);
    });

  providerCommand
    .command('detect')
    .description('Detect available API-based providers (v1.6.0+)')
    .action(() => {
      detectModels();
    });

  providerCommand
    .command('list [provider]')
    .description('List models for a provider')
    .option('--json', 'Output in JSON format')
    .action((provider, _options) => {
      listModels(provider);
    });

  providerCommand
    .command('set-model <model>')
    .description('Set the default model for the current provider')
    .action((model) => {
      setModel(model);
    });

  providerCommand
    .command('status')
    .description('Show current provider and model status')
    .action(() => {
      statusModels();
    });

  providerCommand
    .command('configure <provider>')
    .description('Configure a provider interactively')
    .action(async (provider) => {
      const { configService } = await import('../services/configService.js');
      const config = configService.load();
      const providers = (config.providers as Record<string, any>) || {};
      const current = providers[provider] || {};

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'type',
          message: 'Provider Type (e.g., openai-compatible, ollama):',
          default: current.type || (provider === 'ollama' ? 'ollama' : 'openai-compatible'),
        },
        {
          type: 'input',
          name: 'baseUrl',
          message: 'API Base URL:',
          default: current.baseUrl || (provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com'),
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'API Key (leave blank to keep existing):',
          mask: '*',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Default Model ID:',
          default: config.defaults.model,
        },
      ]);

      // Filter out empty apiKey so it doesn't overwrite existing one
      const options = {
        ...answers,
        apiKey: answers.apiKey ? answers.apiKey : undefined,
      };

      upsertProviderConfig(provider, options);
      setProvider(provider);
    });

  program.addCommand(providerCommand);
};

