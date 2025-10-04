import axios, { AxiosInstance } from 'axios';
import { Provider, Model, CompletionRequest, CompletionResponse } from './types.js';

export class OpenAICompatibleProvider implements Provider {
  private client: AxiosInstance;

  constructor(private readonly baseURL: string, private readonly apiKey: string) {
    this.client = axios.create({
      baseURL: this.baseURL.replace(/\/$/, ''),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async listModels(): Promise<Model[]> {
    const res = await this.client.get('/v1/models');
    const items = Array.isArray(res.data?.data) ? res.data.data : [];
    return items.map((m: any) => ({ id: String(m.id), name: String(m.id) }));
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
    } catch {
      // Fallback to legacy completions
      const comp = await this.client.post('/v1/completions', {
        model: req.model,
        prompt: req.prompt,
        temperature: req.temperature ?? 0,
        max_tokens: req.maxTokens ?? 256,
        stream: false,
      });
      const content = comp.data?.choices?.[0]?.text ?? '';
      return { content: String(content) };
    }
  }
}
