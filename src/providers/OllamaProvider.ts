import axios, { AxiosInstance } from 'axios';
import { Provider, Model, CompletionRequest, CompletionResponse } from './types.js';

export class OllamaProvider implements Provider {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:11434') {
    this.client = axios.create({ baseURL });
  }

  async listModels(): Promise<Model[]> {
    const response = await this.client.get('/api/tags');
    return response.data.models.map((model: any) => ({ id: model.name, name: model.name }));
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.post('/api/generate', {
      model: request.model,
      prompt: request.prompt,
      stream: false, // For simplicity
    });
    return { content: response.data.response };
  }
}
