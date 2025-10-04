export interface Model {
  id: string;
  name: string;
}

export interface CompletionRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResponse {
  content: string;
}

export interface Provider {
  listModels(): Promise<Model[]>;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
}
