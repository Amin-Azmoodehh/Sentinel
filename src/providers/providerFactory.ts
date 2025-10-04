import { configService } from '../services/configService.js';
import { OllamaProvider } from './OllamaProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { Provider } from './types.js';

const getProviderConfig = (name: string) => {
  const config = configService.load();
  const providerConfig = (config.providers as Record<string, any>)?.[name];
  if (!providerConfig) {
    throw new Error(`Configuration for provider '${name}' not found.`);
  }
  return providerConfig;
};

export const getProvider = (name: string): Provider => {
  if (name === 'ollama') {
    const config = getProviderConfig('ollama');
    return new OllamaProvider(config.baseURL);
  }

  const config = getProviderConfig(name);
  if (!config.baseURL || !config.apiKey) {
    throw new Error(`'baseURL' and 'apiKey' are required for provider '${name}'.`);
  }
  return new OpenAICompatibleProvider(config.baseURL, config.apiKey);
};

export const getAvailableProviders = (): string[] => {
  const config = configService.load();
  return Object.keys(config.providers || {});
};
