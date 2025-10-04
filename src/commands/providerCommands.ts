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
    // OpenAI
    openai: [
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini'
    ],
    
    // Anthropic Claude
    claude: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ],
    
    // Google Gemini
    gemini: [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
      'gemini-pro-vision'
    ],
    
    // Mistral AI
    mistral: [
      'mistral-large-latest',
      'mistral-large-2407',
      'mistral-medium-latest',
      'mistral-small-latest',
      'mistral-nemo',
      'codestral-latest',
      'mixtral-8x7b-instruct'
    ],
    
    // OpenRouter (Multi-Provider) - Free models prioritized
    openrouter: [
      // Free Models
      'deepseek/deepseek-chat',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.1-8b-instruct:free',
      'microsoft/phi-3-medium-128k-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'huggingfaceh4/zephyr-7b-beta:free',
      'openchat/openchat-7b:free',
      'gryphe/mythomist-7b:free',
      'undi95/toppy-m-7b:free',
      'openrouter/auto',
      // Popular Paid Models
      'x-ai/grok-2-latest',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-405b-instruct',
      'qwen/qwen-2.5-72b-instruct',
      'mistralai/mixtral-8x22b-instruct',
      'anthropic/claude-3-opus',
      'cohere/command-r-plus'
    ],
    
    // Groq (Fast Inference)
    groq: [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-90b-text-preview',
      'llama-3.2-11b-text-preview',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'whisper-large-v3'
    ],
    
    // Together AI
    together: [
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'microsoft/DialoGPT-medium'
    ],
    
    // DeepSeek
    deepseek: [
      'deepseek-chat',
      'deepseek-coder',
      'deepseek-math',
      'deepseek-reasoner'
    ],
    
    // Perplexity
    perplexity: [
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-small-128k-online',
      'llama-3.1-sonar-large-128k-chat',
      'llama-3.1-sonar-small-128k-chat'
    ],
    
    // Cohere
    cohere: [
      'command-r-plus',
      'command-r',
      'command',
      'command-nightly',
      'command-light'
    ],
    
    // AI21 Labs
    ai21: [
      'jamba-1.5-large',
      'jamba-1.5-mini',
      'j2-ultra',
      'j2-mid',
      'j2-light'
    ],
    
    // Hugging Face
    huggingface: [
      'microsoft/DialoGPT-large',
      'microsoft/DialoGPT-medium',
      'facebook/blenderbot-400M-distill',
      'microsoft/GODEL-v1_1-large-seq2seq',
      'EleutherAI/gpt-j-6b'
    ],
    
    // Fireworks AI
    fireworks: [
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-8b-instruct',
      'accounts/fireworks/models/mixtral-8x7b-instruct',
      'accounts/fireworks/models/qwen2p5-72b-instruct'
    ],
    
    // Anyscale
    anyscale: [
      'meta-llama/Llama-2-70b-chat-hf',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-2-7b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1'
    ],
    
    // Replicate
    replicate: [
      'meta/llama-2-70b-chat',
      'meta/llama-2-13b-chat',
      'meta/llama-2-7b-chat',
      'mistralai/mixtral-8x7b-instruct-v0.1'
    ],
    
    // Ollama (Local)
    ollama: [
      'llama3.2:latest',
      'llama3.1:latest',
      'llama3:latest',
      'qwen2.5:latest',
      'qwen2.5:32b',
      'qwen2.5:14b',
      'qwen2.5:7b',
      'mistral:latest',
      'mixtral:latest',
      'codellama:latest',
      'deepseek-coder:latest',
      'phi3:latest',
      'gemma2:latest',
      'nomic-embed-text:latest'
    ],
    
    // LM Studio (Local)
    lmstudio: [
      'llama-3.1-8b-instruct',
      'llama-3.1-70b-instruct',
      'qwen2.5-7b-instruct',
      'mistral-7b-instruct',
      'codellama-7b-instruct'
    ],
    
    // LocalAI (Local)
    localai: [
      'gpt-3.5-turbo',
      'gpt-4',
      'llama2-chat',
      'codellama-instruct'
    ],
    
    // Jan (Local)
    jan: [
      'trinity-v1.2-7b',
      'stealth-v1.2-7b',
      'llama2-chat-7b',
      'mistral-ins-7b-q4'
    ],
    
    // Azure OpenAI
    azure: [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-35-turbo',
      'text-embedding-ada-002'
    ]
  };
  
  return popularModels[provider] || ['gpt-4o', 'gpt-3.5-turbo'];
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

