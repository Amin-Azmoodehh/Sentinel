export const preconfiguredProviders = {
  // Local & Free
  ollama: {
    type: 'ollama',
    baseURL: 'http://localhost:11434',
  },
  lmstudio: {
    type: 'openai-compatible',
    baseURL: 'http://localhost:1234/v1',
    apiKey: 'not-needed',
  },
  localai: {
    type: 'openai-compatible',
    baseURL: 'http://localhost:8080/v1',
    apiKey: 'not-needed',
  },
  jan: {
    type: 'openai-compatible',
    baseURL: 'http://localhost:1337/v1',
    apiKey: 'not-needed',
  },

  // Major Cloud Providers
  openai: {
    type: 'openai-compatible',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
  },
  claude: {
    type: 'openai-compatible',
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: '',
  },
  gemini: {
    type: 'openai-compatible',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
  },
  mistral: {
    type: 'openai-compatible',
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: '',
  },

  // Multi-Model Platforms
  openrouter: {
    type: 'openai-compatible',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '',
  },
  together: {
    type: 'openai-compatible',
    baseURL: 'https://api.together.xyz/v1',
    apiKey: '',
  },
  replicate: {
    type: 'openai-compatible',
    baseURL: 'https://openai-proxy.replicate.com/v1',
    apiKey: '',
  },
  huggingface: {
    type: 'openai-compatible',
    baseURL: 'https://api-inference.huggingface.co/v1',
    apiKey: '',
  },

  // Fast Inference
  groq: {
    type: 'openai-compatible',
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: '',
  },
  fireworks: {
    type: 'openai-compatible',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    apiKey: '',
  },
  anyscale: {
    type: 'openai-compatible',
    baseURL: 'https://api.endpoints.anyscale.com/v1',
    apiKey: '',
  },

  // Specialized Providers
  deepseek: {
    type: 'openai-compatible',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: '',
  },
  perplexity: {
    type: 'openai-compatible',
    baseURL: 'https://api.perplexity.ai',
    apiKey: '',
  },
  cohere: {
    type: 'openai-compatible',
    baseURL: 'https://api.cohere.ai/v1',
    apiKey: '',
  },
  ai21: {
    type: 'openai-compatible',
    baseURL: 'https://api.ai21.com/studio/v1',
    apiKey: '',
  },

  // Enterprise
  azure: {
    type: 'openai-compatible',
    baseURL: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
    apiKey: '',
  },
};
