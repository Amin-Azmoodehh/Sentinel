import { configService } from '../services/configService.js';
import { preconfiguredProviders } from '../constants/preconfiguredProviders.js';
import { OllamaProvider } from './OllamaProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { Provider } from './types.js';

const getProviderConfig = (name: string) => {
  const config = configService.load();
  const userProviderConfig = (config.providers as Record<string, any>)?.[name];

  // Get preconfigured defaults
  const preconfig = (preconfiguredProviders as Record<string, any>)[name];
  if (!preconfig) {
    throw new Error(`Provider '${name}' not found in preconfigured providers.`);
  }

  // If user has configured this provider, merge with defaults
  if (userProviderConfig) {
    return {
      ...preconfig,
      ...userProviderConfig,
    };
  }

  // Otherwise, use preconfigured defaults (will need API key later)
  return preconfig;
};

export const getProvider = (name: string): Provider => {
  const config = getProviderConfig(name);

  // Determine provider type
  const providerType = config.type || 'openai-compatible';

  if (providerType === 'ollama') {
    if (!config.baseURL) {
      throw new Error(`'baseURL' is required for Ollama provider '${name}'.`);
    }
    return new OllamaProvider(config.baseURL);
  }

  // Handle all OpenAI-compatible providers (including openrouter, claude, gemini, etc.)
  if (providerType === 'openai-compatible') {
    if (!config.baseURL) {
      throw new Error(`'baseURL' is required for provider '${name}'.`);
    }

    // Allow empty API key for now - will be handled by the calling code
    const apiKey = config.apiKey || '';
    return new OpenAICompatibleProvider(config.baseURL, apiKey);
  }

  throw new Error(
    `Unknown provider type '${providerType}' for provider '${name}'. Supported types: 'ollama', 'openai-compatible'`
  );
};

export const getAvailableProviders = (): string[] => {
  // Return all preconfigured providers, not just the ones in user config
  return Object.keys(preconfiguredProviders);
};
