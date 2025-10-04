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

const getPopularModelsForProvider = (provider: string): string[] => {
  const popularModels: Record<string, string[]> = {
    openai: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    claude: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    openrouter: ['deepseek/deepseek-chat', 'x-ai/grok-2-latest', 'anthropic/claude-3.5-sonnet'],
    groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    together: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    deepseek: ['deepseek-chat', 'deepseek-coder'],
    perplexity: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
    cohere: ['command-r-plus', 'command-r', 'command'],
    ai21: ['jamba-1.5-large', 'jamba-1.5-mini'],
    ollama: ['llama3.1', 'llama3', 'qwen2.5', 'mistral', 'codellama'],
  };
  
  return popularModels[provider] || ['gpt-4', 'gpt-3.5-turbo'];
};

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

      // Step 1: Try to fetch models with existing config (if any) or show popular models
      let models: string[] = [];
      let needsApiKey = false;

      try {
        console.log('Checking available models...');
        const result = await listModels(provider);
        models = result.models;
      } catch (error) {
        // If fetching fails, show popular models for this provider
        needsApiKey = true;
        models = getPopularModelsForProvider(provider);
        if (models.length === 0) {
          console.log('Could not determine available models. You can configure the API key first.');
          models = ['gpt-4', 'gpt-3.5-turbo']; // fallback
        }
      }

      // Step 2: Let user choose a model
      const { chosenModel } = await inquirer.prompt([
        {
          type: 'list',
          name: 'chosenModel',
          message: needsApiKey 
            ? `Choose a model for ${provider} (API key required):` 
            : `Choose a default model from ${provider}:`,
          choices: models,
        },
      ]);

      // Step 3: Get API key if needed
      let apiKey = (preconfig as any).apiKey || '';
      
      if (needsApiKey || provider !== 'ollama') {
        const { inputApiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'inputApiKey',
            message: `Enter API Key for ${provider} (required for ${chosenModel}):`,
            mask: '*',
            validate: (input: string) => {
              if (provider === 'ollama') return true;
              return input.length > 0 || 'API key is required for this provider';
            },
          },
        ]);
        apiKey = inputApiKey;
      }

      // Step 4: Save configuration
      upsertProviderConfig(provider, { ...preconfig, apiKey, model: chosenModel });
      setProvider(provider);

      console.log(`Successfully configured '${provider}' with model '${chosenModel}' and set it as default.`);

      // Step 5: Verify configuration by testing the connection
      if (apiKey && provider !== 'ollama') {
        try {
          console.log('Verifying configuration...');
          const { models: verifiedModels } = await listModels(provider);
          if (verifiedModels.length > 0) {
            console.log(`✅ Configuration verified! Found ${verifiedModels.length} models.`);
          }
        } catch (error) {
          console.log('⚠️ Configuration saved but could not verify connection. Please check your API key.');
        }
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

  // Register a completely separate 'set' command with 'provider' subcommand
  const setCommand = new Command('set');
  setCommand.description('⚙️ Quick configuration shortcuts');
  
  setCommand
    .command('provider')
    .description('Configure a provider interactively (alias for st provider configure)')
    .action(async () => {
      // Interactive provider selection
      const { chosenProvider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'chosenProvider',
          message: 'Choose a provider to configure:',
          choices: Object.keys(preconfiguredProviders),
        },
      ]);
      const provider = chosenProvider;

      const preconfig = preconfiguredProviders[provider as keyof typeof preconfiguredProviders];
      if (!preconfig) {
        console.log(`Unknown provider: ${provider}. Use one of: ${Object.keys(preconfiguredProviders).join(', ')}`);
        return;
      }

      // Interactive API key input
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter API Key for ${provider} (leave blank if not needed):`,
          mask: '*',
        },
      ]);

      upsertProviderConfig(provider, { ...preconfig, apiKey });

      try {
        console.log('Fetching models from provider...');
        const { models } = await listModels(provider);
        if (models.length === 0) {
          console.log('Could not fetch models. Please check your API key and network connection.');
          return;
        }

        // Interactive model selection
        const { chosenModel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'chosenModel',
            message: 'Choose a default model:',
            choices: models,
          },
        ]);

        upsertProviderConfig(provider, { model: chosenModel });
        setProvider(provider);

        console.log(`Successfully configured '${provider}' with model '${chosenModel}' and set it as default.`);

      } catch (error) {
        console.log(`Error fetching models: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  
  program.addCommand(setCommand);
};

