import { Command } from 'commander';
import inquirer from 'inquirer';
import { preconfiguredProviders } from '../constants/preconfiguredProviders.js';
import {
  setProvider,
  detectModels,
  listModels,
  setModel,
  statusModels,
  upsertProviderConfig,
} from '../services/providerService.js';

export const registerProviderCommands = (program: Command) => {
  const providerCommand = new Command('provider');
  providerCommand.description('🤖 Manage AI providers via API (Ollama, OpenAI, Claude, Gemini)');

  providerCommand
    .command('set [provider]')
    .description('Set the default provider, or configure one with flags')
    .option('--type <type>', 'Provider type (e.g., ollama, openai-compatible)')
    .option('--base-url <url>', 'API endpoint base URL')
    .option('--api-key <key>', 'Your secret API key')
    .option('--model <id>', 'Default model ID for this provider')
    .action(async (provider, options) => {
      let providerToSet = provider;
      if (!providerToSet) {
        const { configService } = await import('../services/configService.js');
        const config = configService.load();
        const providers = Object.keys(config.providers || {});
        if (providers.length === 0) {
          console.log('No providers configured. Use `st provider configure` to add one.');
          return;
        }
        const { chosenProvider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'chosenProvider',
            message: 'Choose a provider to set as default:',
            choices: providers,
          },
        ]);
        providerToSet = chosenProvider;
      }

      if (Object.keys(options).length > 0) {
        upsertProviderConfig(providerToSet, options);
      }
      
      setProvider(providerToSet);
    });

    providerCommand
    .command('configure [provider]')
    .description('Configure a provider interactively')
    .action(async (providerName) => {
      let provider = providerName;
      if (!provider) {
        const { chosenProvider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'chosenProvider',
            message: 'Choose a provider to configure:',
            choices: Object.keys(preconfiguredProviders),
          },
        ]);
        provider = chosenProvider;
      }

      const preconfig = preconfiguredProviders[provider as keyof typeof preconfiguredProviders];
      if (!preconfig) {
        console.log(`Unknown provider: ${provider}. Use one of: ${Object.keys(preconfiguredProviders).join(', ')}`);
        return;
      }

      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter API Key for ${provider} (leave blank if not needed):`,
          mask: '*',
        },
      ]);

      // First, save the provider config with the API key
      upsertProviderConfig(provider, { ...preconfig, apiKey });

      try {
        console.log('Fetching models from provider...');
        const { models } = await listModels(provider);
        if (models.length === 0) {
          console.log('Could not fetch models. Please check your API key and network connection.');
          return;
        }

        const { chosenModel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'chosenModel',
            message: 'Choose a default model:',
            choices: models,
          },
        ]);

        // Now, update the config with the chosen model and set it as the default provider
        upsertProviderConfig(provider, { model: chosenModel });
        setProvider(provider);

        console.log(`Successfully configured '${provider}' with model '${chosenModel}' and set it as default.`);

      } catch (error) {
        console.log(`Error fetching models: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

  providerCommand
    .command('detect')
    .description('Detect available API-based providers')
    .action(async () => { await detectModels(); });

  providerCommand
    .command('list [provider]')
    .description('List models for a provider')
    .action(async (provider) => { await listModels(provider); });

  providerCommand
    .command('set-model <model>')
    .description('Set the default model for the current provider')
    .action((model) => setModel(model));

  providerCommand
    .command('status')
    .description('Show current provider and model status')
    .action(() => statusModels());

    program.addCommand(providerCommand);

  // Alias for `st set provider`
  let legacySetCommand = program.commands.find((cmd) => cmd.name() === 'set');
  if (!legacySetCommand) {
    legacySetCommand = program.command('set').description('⚙️ Quick configuration shortcuts');
  }
  legacySetCommand
    .command('provider')
    .description('Alias for `st provider configure`')
    .action(async () => {
      await providerCommand.commands.find(c => c.name() === 'configure')?.parseAsync(process.argv);
    });
};

