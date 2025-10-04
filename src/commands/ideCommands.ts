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

      const provider = getProvider(providerName);
      log.info(`Fetching models from ${providerName}...`);
      const models = await provider.listModels();

      if (models.length === 0) {
        log.error(`No models found for provider '${providerName}'.`);
        return;
      }

      log.success(`Found ${models.length} models`);

      const modelChoices = models.map((m) => {
        const isCurrentModel = m.id === tempModel && providerName === tempProvider;
        return {
          name: `${m.id}${isCurrentModel ? ' ⭐ current' : ''}`,
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

      log.info(`\n📁 Generated ${applied.length} IDE configuration${applied.length > 1 ? 's' : ''}`);
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

      const provider = getProvider(providerName);
      const models = await provider.listModels();

      if (models.length === 0) {
        log.error(`No models found for provider '${providerName}'.`);
        return;
      }

      const { modelId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'modelId',
          message: `Select a model from ${providerName}:`,
          choices: models.map((m) => m.id),
        },
      ]);

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

      log.info(`\n📁 Generated ${applied.length} IDE configuration${applied.length > 1 ? 's' : ''}`);
    });
  
  program.addCommand(setCommand);
};
