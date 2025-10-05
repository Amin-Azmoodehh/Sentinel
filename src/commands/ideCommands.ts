import { Command } from 'commander';
import inquirer from 'inquirer';
import { setIde, getAvailableIdes } from '../services/ideService.js';
import { getAvailableProviders, getProvider } from '../providers/providerFactory.js';
import { configService } from '../services/configService.js';
import { log } from '../utils/logger.js';

export const registerIdeCommands = (program: Command): void => {
  const ide = program.command('ide').description('Configure IDE MCP integration');

  ide
    .command('set [ides...]')
    .description('Set up IDE configurations')
    .action(async (ides: string[]) => {
      let targets = ides;
      if (targets.length === 0) {
        const availableIdes = getAvailableIdes();
        const { chosenIdes } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'chosenIdes',
            message: 'Select IDEs to configure:',
            choices: availableIdes,
          },
        ]);
        targets = chosenIdes;
      }

      if (targets.length === 0) {
        log.info('No IDEs selected. Exiting.');
        return;
      }

      const availableProviders = getAvailableProviders();
      if (availableProviders.length === 0) {
        log.error('No providers configured. Please run `st config set` to add a provider.');
        return;
      }

      // Enrich provider list with details
      const tempConfig = configService.load();
      const tempProvider = tempConfig.defaults.provider;
      const tempModel = tempConfig.defaults.model;

      const providerChoices = availableProviders.map((name) => {
        const providerConfig = (tempConfig.providers as Record<string, any>)?.[name];
        const type = providerConfig?.type || 'unknown';
        const isCurrent = name === tempProvider;
        const hasApiKey = providerConfig?.apiKey ? '🔑' : '🔓';

        return {
          name: `${name} ${hasApiKey} (${type})${isCurrent ? ' ⭐ current' : ''}`,
          value: name,
          short: name,
        };
      });

      const { providerName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'providerName',
          message: `Select a provider ${tempProvider ? `(current: ${tempProvider} → ${tempModel})` : ''}:`,
          choices: providerChoices,
        },
      ]);

      // Check if provider is properly configured (skip validation for now, let user configure it)
      // We'll handle API key validation later in the flow

      let provider;
      try {
        provider = getProvider(providerName);
      } catch (error) {
        log.error(
          `Failed to initialize provider '${providerName}': ${error instanceof Error ? error.message : String(error)}`
        );
        log.warn(`Please run: st provider configure ${providerName}`);
        return;
      }

      // Try to fetch models, but if it fails, show popular models
      let models: any[] = [];
      let needsApiKey = false;

      try {
        log.info(`Fetching models from ${providerName}...`);
        models = await provider.listModels();
        log.success(`Found ${models.length} models`);
      } catch (error) {
        log.warn(`Could not fetch models from ${providerName}. Showing popular models instead.`);
        needsApiKey = true;

        // Import the function from providerCommands
        const { getPopularModelsForProvider } = await import('./providerCommands.js');
        const popularModels = getPopularModelsForProvider(providerName);
        models = popularModels.map((id: string) => ({ id }));
      }

      if (models.length === 0) {
        log.error(`No models available for provider '${providerName}'.`);
        return;
      }

      const modelChoices = models.map((m) => {
        const isCurrentModel = m.id === tempModel && providerName === tempProvider;
        const suffix = isCurrentModel ? ' ⭐ current' : needsApiKey ? ' (requires API key)' : '';
        return {
          name: `${m.id}${suffix}`,
          value: m.id,
          short: m.id,
        };
      });

      const { modelId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'modelId',
          message: `Select a model from ${providerName}:`,
          choices: modelChoices,
          pageSize: 15,
        },
      ]);

      // Step 3: Get API key if needed
      if (
        needsApiKey ||
        (providerName !== 'ollama' &&
          providerName !== 'lmstudio' &&
          providerName !== 'localai' &&
          providerName !== 'jan')
      ) {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: `Enter API Key for ${providerName} (required for ${modelId}):`,
            mask: '*',
            validate: (input: string) => {
              return input.length > 0 || 'API key is required for this provider';
            },
          },
        ]);

        // Save the API key to config
        const currentConfig = configService.load();
        if (!currentConfig.providers) {
          (currentConfig as any).providers = {};
        }
        const existingProvider = (currentConfig.providers as any)[providerName] || {};
        (currentConfig.providers as any)[providerName] = {
          ...existingProvider,
          apiKey: apiKey,
        };
        configService.save(currentConfig);
        log.success(`API key saved for ${providerName}`);
      }

      const config = configService.load();
      config.defaults.provider = providerName;
      config.defaults.model = modelId;
      configService.save(config);
      log.success(`Set default provider to '${providerName}' and model to '${modelId}'.`);

      const { applyRules } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'applyRules',
          message: 'Apply Zero Tolerance rules to selected IDEs?',
          default: true,
        },
      ]);

      const applied = setIde(targets, applyRules, providerName);

      if (applied.length === 0) {
        log.warn('No IDE profiles were configured!');
        return;
      }

      log.raw('\n🎯 IDE Configuration Complete');
      applied.forEach((name) => {
        log.success(`${name} → MCP profile ready`);
      });

      log.info(
        `\n📁 Generated ${applied.length} IDE configuration${applied.length > 1 ? 's' : ''}`
      );
    });

  ide
    .command('list')
    .description('List available IDE targets')
    .action(() => {
      log.raw('\n💻 Available IDE Targets');
      const ides = getAvailableIdes();
      ides.forEach((name) => {
        log.info(`• ${name}`);
      });
      log.raw('\n💡 Usage: st ide set');
    });

  // Register a completely separate 'set' command with 'ide' subcommand as an alias
  const setCommand = new Command('set');
  setCommand.description('⚙️ Quick configuration shortcuts');

  setCommand
    .command('ide')
    .description('Configure IDE profiles (alias for st ide set)')
    .action(async () => {
      // Interactive IDE selection
      const availableIdes = getAvailableIdes();
      const { chosenIdes } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'chosenIdes',
          message: 'Select IDEs to configure:',
          choices: availableIdes,
        },
      ]);
      const targets = chosenIdes;

      if (targets.length === 0) {
        log.info('No IDEs selected. Exiting.');
        return;
      }

      const availableProviders = getAvailableProviders();
      if (availableProviders.length === 0) {
        log.error('No providers configured. Please run `st provider configure` to add a provider.');
        return;
      }

      // Enrich provider list with details
      const currentConfig = configService.load();
      const currentProvider = currentConfig.defaults.provider;
      const currentModel = currentConfig.defaults.model;

      const providerChoices = availableProviders.map((name) => {
        const providerConfig = (currentConfig.providers as Record<string, any>)?.[name];
        const type = providerConfig?.type || 'unknown';
        const isCurrent = name === currentProvider;
        const hasApiKey = providerConfig?.apiKey ? '🔑' : '🔓';

        return {
          name: `${name} ${hasApiKey} (${type})${isCurrent ? ' ⭐ current' : ''}`,
          value: name,
          short: name,
        };
      });

      const { providerName } = await inquirer.prompt([
        {
          type: 'list',
          name: 'providerName',
          message: `Select a provider ${currentProvider ? `(current: ${currentProvider} → ${currentModel})` : ''}:`,
          choices: providerChoices,
        },
      ]);

      // Check if provider is properly configured (skip validation for now, let user configure it)
      // We'll handle API key validation later in the flow

      let provider;
      try {
        provider = getProvider(providerName);
      } catch (error) {
        log.error(
          `Failed to initialize provider '${providerName}': ${error instanceof Error ? error.message : String(error)}`
        );
        log.warn(`Please run: st provider configure ${providerName}`);
        return;
      }

      // Try to fetch models, but if it fails, show popular models
      let models: any[] = [];
      let needsApiKey = false;

      try {
        log.info(`Fetching models from ${providerName}...`);
        models = await provider.listModels();
        log.success(`Found ${models.length} models`);
      } catch (error) {
        log.warn(`Could not fetch models from ${providerName}. Showing popular models instead.`);
        needsApiKey = true;

        // Import the function from providerCommands
        const { getPopularModelsForProvider } = await import('./providerCommands.js');
        const popularModels = getPopularModelsForProvider(providerName);
        models = popularModels.map((id: string) => ({ id }));
      }

      if (models.length === 0) {
        log.error(`No models available for provider '${providerName}'.`);
        return;
      }

      const modelChoices = models.map((m) => {
        const isCurrentModel = m.id === currentModel && providerName === currentProvider;
        const suffix = isCurrentModel ? ' ⭐ current' : needsApiKey ? ' (requires API key)' : '';
        return {
          name: `${m.id}${suffix}`,
          value: m.id,
          short: m.id,
        };
      });

      const { modelId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'modelId',
          message: `Select a model from ${providerName}:`,
          choices: modelChoices,
          pageSize: 15,
        },
      ]);

      // Step 3: Get API key if needed
      if (
        needsApiKey ||
        (providerName !== 'ollama' &&
          providerName !== 'lmstudio' &&
          providerName !== 'localai' &&
          providerName !== 'jan')
      ) {
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: `Enter API Key for ${providerName} (required for ${modelId}):`,
            mask: '*',
            validate: (input: string) => {
              return input.length > 0 || 'API key is required for this provider';
            },
          },
        ]);

        // Save the API key to config
        const config = configService.load();
        if (!config.providers) {
          (config as any).providers = {};
        }
        const existingProvider = (config.providers as any)[providerName] || {};
        (config.providers as any)[providerName] = {
          ...existingProvider,
          apiKey: apiKey,
        };
        configService.save(config);
        log.success(`API key saved for ${providerName}`);
      }

      const config = configService.load();
      config.defaults.provider = providerName;
      config.defaults.model = modelId;
      configService.save(config);
      log.success(`Set default provider to '${providerName}' and model to '${modelId}'.`);

      const { applyRules } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'applyRules',
          message: 'Apply Zero Tolerance rules to selected IDEs?',
          default: true,
        },
      ]);

      const applied = setIde(targets, applyRules, providerName);

      if (applied.length === 0) {
        log.warn('No IDE profiles were configured!');
        return;
      }

      log.raw('\n🎯 IDE Configuration Complete');
      applied.forEach((name) => {
        log.success(`${name} → MCP profile ready`);
      });

      log.info(
        `\n📁 Generated ${applied.length} IDE configuration${applied.length > 1 ? 's' : ''}`
      );
    });

  program.addCommand(setCommand);
};
