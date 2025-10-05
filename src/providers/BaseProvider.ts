import axios, { AxiosInstance } from 'axios';
import { configService } from '../services/configService.js';

export abstract class BaseProvider {
  protected apiKey: string;
  protected client: AxiosInstance;

  constructor(providerName: string, baseURL: string) {
    const config = configService.load();
    // Assuming API keys are stored in config under provider name
    const providers = config.providers as Record<string, any> | undefined;
    this.apiKey = providers?.[providerName]?.apiKey || '';

    if (!this.apiKey) {
      throw new Error(`API key for ${providerName} not found.`);
    }

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }
}
