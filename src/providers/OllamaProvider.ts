import axios, { AxiosInstance } from 'axios';
import { Provider, Model, CompletionRequest, CompletionResponse } from './types.js';
import { contextMonitorService } from '../services/contextMonitorService.js';

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
    // Count input tokens
    const inputTokens = contextMonitorService.countTokens(request.prompt, request.model);
    
    const response = await this.client.post('/api/generate', {
      model: request.model,
      prompt: request.prompt,
      stream: false, // For simplicity
    });
    
    // Count output tokens and record usage
    const outputTokens = contextMonitorService.countTokens(response.data.response, request.model);
    contextMonitorService.recordTokenUsage(inputTokens, outputTokens, `ollama_completion_${request.model}`);
    
    return { content: response.data.response };
  }
}
