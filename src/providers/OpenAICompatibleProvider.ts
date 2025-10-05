import axios, { AxiosInstance } from 'axios';
import { Provider, Model, CompletionRequest, CompletionResponse } from './types.js';
// import { contextMonitorService } from '../services/contextMonitorService.js';

export class OpenAICompatibleProvider implements Provider {
  private client: AxiosInstance;

  constructor(
    private readonly baseURL: string,
    private readonly apiKey: string
  ) {
    // Normalize baseURL - remove trailing slash but keep /v1 if present
    let normalizedBaseURL = this.baseURL.replace(/\/+$/, '');
    
    // If baseURL doesn't end with /v1, we'll add it in requests
    // If it does, we'll use it as-is
    this.client = axios.create({
      baseURL: normalizedBaseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sentineltm.dev',
        'X-Title': 'SentinelTM',
      },
      timeout: 60000, // Increase timeout to 60s for AI operations
    });
  }

  async listModels(): Promise<Model[]> {
    try {
      // Use /v1/models if baseURL doesn't already include /v1
      const endpoint = this.baseURL.includes('/v1') ? '/models' : '/v1/models';
      const res = await this.client.get(endpoint);
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      return items.map((m: { id: string }) => ({ id: String(m.id), name: String(m.id) }));
    } catch (error: unknown) {
      // Some providers might have different endpoints or require different auth
      if (axios.isAxiosError(error) && error.response?.status === 405) {
        // Method not allowed - try different approach or return empty
        console.warn(`Provider ${this.baseURL} does not support models endpoint`);
        return [];
      }
      throw error;
    }
  }

  async generateCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    // Use correct endpoint based on whether baseURL includes /v1
    const chatEndpoint = this.baseURL.includes('/v1') ? '/chat/completions' : '/v1/chat/completions';
    const completionsEndpoint = this.baseURL.includes('/v1') ? '/completions' : '/v1/completions';
    
    // Prefer chat/completions if available
    try {
      const chat = await this.client.post(chatEndpoint, {
        model: req.model,
        messages: [{ role: 'user', content: req.prompt }],
        temperature: req.temperature ?? 0,
        max_tokens: req.maxTokens ?? 2000, // Increase for longer responses
        stream: false,
      });
      const content = chat.data?.choices?.[0]?.message?.content ?? '';

      return { content: String(content) };
    } catch (error: unknown) {
      // Handle 405 Method Not Allowed
      if (axios.isAxiosError(error) && error.response?.status === 405) {
        throw new Error(
          `Provider ${this.baseURL} returned 405 Method Not Allowed. This usually means the API endpoint or HTTP method is incorrect. Please check the provider's API documentation.`
        );
      }

      // Try fallback to legacy completions
      try {
        const comp = await this.client.post(completionsEndpoint, {
          model: req.model,
          prompt: req.prompt,
          temperature: req.temperature ?? 0,
          max_tokens: req.maxTokens ?? 2000,
          stream: false,
        });
        const content = comp.data?.choices?.[0]?.text ?? '';

        return { content: String(content) };
      } catch (fallbackError: unknown) {
        const errorMsg = axios.isAxiosError(error) ? error.message : String(error);
        const fallbackMsg = axios.isAxiosError(fallbackError) ? fallbackError.message : String(fallbackError);
        // If both fail, throw the original error with more context
        throw new Error(
          `Both chat/completions and completions failed. Original error: ${errorMsg}. Fallback error: ${fallbackMsg}`
        );
      }
    }
  }
}
