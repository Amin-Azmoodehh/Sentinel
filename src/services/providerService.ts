import { configService } from './configService.js';
import { log, formatHeading } from '../utils/logger.js';
import chalk from 'chalk';
import { Provider, Model, CompletionRequest, CompletionResponse } from '../providers/types.js';
import { OllamaProvider } from '../providers/OllamaProvider.js';
import { OpenAICompatibleProvider } from '../providers/OpenAICompatibleProvider.js';

export interface ProviderInfo {
  name: string;
  type: string;
  available: boolean;
  path?: string; // Legacy compatibility - will be removed in future versions
}

export interface ProviderDetectResult {
  providers: ProviderInfo[];
  scanned: string[];
}

export interface ModelsListResult {
  models: string[];
  source: 'provider' | 'cache';
}

export interface ProviderUpsertOptions {
  type?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string; // convenience: also update defaults.model
}

// Create or update a provider entry in config.providers
export const upsertProviderConfig = (name: string, opts: ProviderUpsertOptions = {}): void => {
  const config = configService.load();
  const providers = (config.providers as Record<string, any>) || {};
  const canonical = normalizeProviderName(name);
  const current = providers[canonical] || {};

  const nextType = opts.type || current.type || (canonical === 'ollama' ? 'ollama' : 'openai-compatible');
  const nextBaseUrl = opts.baseUrl ?? current.baseUrl ?? (nextType === 'ollama' ? 'http://localhost:11434' : undefined);
  const nextApiKey = opts.apiKey ?? current.apiKey ?? '';

  providers[canonical] = {
    ...current,
    type: nextType,
    ...(nextBaseUrl ? { baseUrl: nextBaseUrl } : {}),
    ...(typeof nextApiKey === 'string' ? { apiKey: nextApiKey } : {}),
  };

  (config as any).providers = providers;

  if (opts.model) {
    config.defaults = config.defaults || ({} as any);
    (config.defaults as any).model = opts.model;
  }

  // If default provider not set, set it to this one
  if (!config.defaults?.provider) {
    config.defaults = { ...(config.defaults || {}), provider: canonical } as any;
  }

  configService.save(config);
  log.success(`Provider '${canonical}' configuration updated.`);
};

// Factory to create provider instances based on config
const createProvider = (name: string, config: any): Provider | null => {
  const providerConfig = config.providers?.[name];
  if (!providerConfig) {
    return null;
  }

  const type = providerConfig.type || name;

  try {
    switch (type) {
      case 'ollama':
        return new OllamaProvider(providerConfig.baseUrl || 'http://localhost:11434');
      
      case 'openai':
      case 'openai-compatible':
      case 'gemini':
      case 'qwen':
      case 'codex':
        if (!providerConfig.apiKey) {
          log.warn(`Provider '${name}' requires an API key in config.`);
          return null;
        }
        return new OpenAICompatibleProvider(
          providerConfig.baseUrl || 'https://api.openai.com',
          providerConfig.apiKey
        );
      
      default:
        log.warn(`Unknown provider type '${type}' for provider '${name}'.`);
        return null;
    }
  } catch (error) {
    log.error(`Failed to create provider '${name}': ${(error as Error).message}`);
    return null;
  }
};

export const normalizeProviderName = (provider: string): string => {
  return (provider || '').trim().toLowerCase();
};

export const detectProviders = (): ProviderDetectResult => {
  const config = configService.load();
  const providerConfigs = (config.providers as Record<string, any>) || {};
  const scanned: string[] = [];
  const providers: ProviderInfo[] = [];

  for (const name of Object.keys(providerConfigs)) {
    scanned.push(name);
    const provider = createProvider(name, config);
    
    providers.push({
      name,
      type: providerConfigs[name]?.type || name,
      available: provider !== null,
    });
  }

  return { providers, scanned };
};

export const setProvider = (provider: string): void => {
  const config = configService.load();
  // Keep defaults in sync
  config.defaults.provider = normalizeProviderName(provider);
  configService.save(config);
  const providerInstance = createProvider(config.defaults.provider, config);
  if (!providerInstance) {
    log.warn(`Provider '${config.defaults.provider}' is not available. Configure it with: st provider set ${config.defaults.provider} --type <type> --base-url <url> [--api-key <key>] [--model <id>]`);
    return;
  }

  log.success(`Provider '${provider}' set successfully.`);
};

export const listModels = async (providerName?: string): Promise<ModelsListResult> => {
  const config = configService.load();
  const selectedProvider = providerName || config.defaults.provider;
  
  if (!selectedProvider) {
    log.warn('No provider specified and no default provider set.');
    return { models: [], source: 'cache' };
  }

  const provider = createProvider(selectedProvider, config);
  if (!provider) {
    log.warn(`Provider '${selectedProvider}' is not available.`);
    return { models: [], source: 'cache' };
  }

  try {
    const modelsList = await provider.listModels();
    const models = modelsList.map((m) => m.id);
    return { models, source: 'provider' };
  } catch (error) {
    log.error(`Failed to list models from '${selectedProvider}': ${(error as Error).message}`);
    return { models: [], source: 'cache' };
  }
};

export const detectModels = async (): Promise<ProviderDetectResult> => {
  const result = detectProviders();

  if (result.providers.length === 0) {
    log.warn('No providers are registered in Sentinel configuration.');
    return result;
  }

  log.raw(formatHeading('AI Provider Detection'));
  log.raw('');

  for (const provider of result.providers) {
    if (provider.available) {
      log.provider(`${chalk.bold(provider.name)} ${chalk.green('✓ Available')} (${provider.type})`);
    } else {
      log.warn(`${chalk.bold(provider.name)} ${chalk.red('✗ Not available')} (${provider.type})`);
    }
  }

  log.raw('');
  const availableCount = result.providers.filter((p) => p.available).length;
  if (availableCount === 0) {
    log.error('No AI providers are available!');
  } else {
    log.rocket(
      `${chalk.bold(availableCount)} AI provider${availableCount > 1 ? 's' : ''} ready for action!`
    );
  }

  return result;
};

export const statusModels = (): void => {
  const config = configService.load();
  const providerName = config.defaults.provider;
  const model = config.defaults.model;
  
  if (!providerName) {
    log.warn('No default provider set.');
    return;
  }

  const provider = createProvider(providerName, config);
  if (!provider) {
    log.warn(`Provider '${providerName}' is not available.`);
    return;
  }

  log.success(`Provider '${providerName}' and model '${model}' are set and available.`);
};

export const setModel = (model: string): void => {
  const config = configService.load();
  config.defaults.model = model;
  configService.save(config);
  log.success(`Default model set to '${model}'.`);
};

export const generateCompletion = async (request: CompletionRequest): Promise<CompletionResponse> => {
  const config = configService.load();
  const providerName = config.defaults.provider;
  
  if (!providerName) {
    throw new Error('No default provider set.');
  }

  const provider = createProvider(providerName, config);
  if (!provider) {
    throw new Error(`Provider '${providerName}' is not available.`);
  }

  return provider.generateCompletion(request);
};

export const getAllowedProviders = (): string[] => {
  const config = configService.load();
  return Object.keys(config.providers || {});
};

export const resolvePreferredProvider = (): ProviderInfo => {
  const config = configService.load();
  const preferredName = config.defaults.provider || 'ollama';
  const detection = detectProviders();
  
  const exact = detection.providers.find((p) => p.name === preferredName && p.available);
  if (exact) {
    return exact;
  }

  const fallback = detection.providers.find((p) => p.available);
  if (fallback) {
    if (config.defaults.provider !== fallback.name) {
      config.defaults.provider = fallback.name;
      configService.save(config);
    }
    return fallback;
  }

  return {
    name: preferredName,
    type: 'unknown',
    available: false,
  };
};

// Legacy compatibility - returns empty array since we don't use CLI paths anymore
export const loadProvidersFromCache = (): any[] => {
  log.warn('loadProvidersFromCache is deprecated. Use detectProviders() instead.');
  return [];
};
