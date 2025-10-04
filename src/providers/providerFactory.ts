import { configService } from '../services/configService.js';
import { preconfiguredProviders } from '../constants/preconfiguredProviders.js';
import { OllamaProvider } from './OllamaProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { Provider } from './types.js';

const getProviderConfig = (name: string) => {
  const config = configService.load();
  const userProviderConfig = (config.providers as Record<string, any>)?.[name];
  
  // If user has configured this provider, use their config
  if (userProviderConfig) {
    return userProviderConfig;
  }
  
  // Otherwise, use preconfigured defaults
  const preconfig = (preconfiguredProviders as Record<string, any>)[name];
  if (!preconfig) {
    throw new Error(`Provider '${name}' not found in preconfigured providers.`);
  }
  
  return preconfig;
};

export const getProvider = (name: string): Provider => {
  if (name === 'ollama') {
    const config = getProviderConfig('ollama');
    return new OllamaProvider(config.baseURL);
  }

  const config = getProviderConfig(name);
  if (!config.baseURL) {
    throw new Error(`'baseURL' is required for provider '${name}'.`);
  }
  
  // Allow empty API key for now - will be handled by the calling code
  const apiKey = config.apiKey || '';
  return new OpenAICompatibleProvider(config.baseURL, apiKey);
};

export const getAvailableProviders = (): string[] => {
  // Return all preconfigured providers, not just the ones in user config
  return Object.keys(preconfiguredProviders);
};
