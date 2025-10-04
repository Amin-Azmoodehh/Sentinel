import axios, { AxiosInstance } from 'axios';
import { Provider, Model, CompletionRequest, CompletionResponse } from './types.js';

export class OpenAICompatibleProvider implements Provider {
  private client: AxiosInstance;

  constructor(private readonly baseURL: string, private readonly apiKey: string) {
    // Clean up baseURL and ensure it doesn't end with /v1
    let cleanBaseURL = this.baseURL.replace(/\/$/, '');
    if (cleanBaseURL.endsWith('/v1')) {
      cleanBaseURL = cleanBaseURL.slice(0, -3);
    }
    
    this.client = axios.create({
      baseURL: cleanBaseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sentineltm.dev',
        'X-Title': 'SentinelTM',
      },
      timeout: 30000,
    });
  }

  async listModels(): Promise<Model[]> {
    try {
      const res = await this.client.get('/v1/models');
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      return items.map((m: any) => ({ id: String(m.id), name: String(m.id) }));
    } catch (error: any) {
      // Some providers might have different endpoints or require different auth
      if (error.response?.status === 405) {
        // Method not allowed - try different approach or return empty
        console.warn(`Provider ${this.baseURL} does not support /v1/models endpoint`);
        return [];
      }
      throw error;
    }
  }

  async generateCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    // Prefer chat/completions if available
    try {
      const chat = await this.client.post('/v1/chat/completions', {
        model: req.model,
        messages: [{ role: 'user', content: req.prompt }],
        temperature: req.temperature ?? 0,
        max_tokens: req.maxTokens ?? 256,
        stream: false,
      });
      const content = chat.data?.choices?.[0]?.message?.content ?? '';
      return { content: String(content) };
    } catch (error: any) {
      // Handle 405 Method Not Allowed
      if (error.response?.status === 405) {
        throw new Error(`Provider ${this.baseURL} returned 405 Method Not Allowed. This usually means the API endpoint or HTTP method is incorrect. Please check the provider's API documentation.`);
      }
      
      // Try fallback to legacy completions
      try {
        const comp = await this.client.post('/v1/completions', {
          model: req.model,
          prompt: req.prompt,
          temperature: req.temperature ?? 0,
          max_tokens: req.maxTokens ?? 256,
          stream: false,
        });
        const content = comp.data?.choices?.[0]?.text ?? '';
        return { content: String(content) };
      } catch (fallbackError: any) {
        // If both fail, throw the original error with more context
        throw new Error(`Both /v1/chat/completions and /v1/completions failed. Original error: ${error.message}. Fallback error: ${fallbackError.message}`);
      }
    }
  }
}
