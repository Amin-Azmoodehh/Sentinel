export const preconfiguredProviders = {
  openai: {
    type: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
  },
  gemini: {
    type: 'openai-compatible',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  mistral: {
    type: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
  },
  openrouter: {
    type: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  ollama: {
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
  },
};
