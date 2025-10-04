import { configService } from './configService.js';
import { log } from '../utils/logger.js';
import { encoding_for_model, get_encoding, Tiktoken } from 'tiktoken';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ContextWindowStats {
  modelContextWindow: number;
  currentSessionTokens: number;
  usagePercentage: number;
  estimatedRemainingTurns: number;
  warningLevel: 'safe' | 'warning' | 'critical';
}

export interface TokenUsageRecord {
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  operation: string;
}

export class ContextMonitorService {
  private static instance: ContextMonitorService;
  private sessionHistory: TokenUsageRecord[] = [];
  private tokenizer: Tiktoken | null = null;
  private sessionFilePath: string;

  constructor() {
    const homeDir = os.homedir();
    const sentinelDir = path.join(homeDir, '.sentineltm');
    if (!fs.existsSync(sentinelDir)) {
      fs.mkdirSync(sentinelDir, { recursive: true });
    }
    this.sessionFilePath = path.join(sentinelDir, 'context-monitor-session.json');
    this.loadSession();
  }

  static getInstance(): ContextMonitorService {
    if (!ContextMonitorService.instance) {
      ContextMonitorService.instance = new ContextMonitorService();
      log.info(`[ContextMonitor] Singleton instance created`);
    }
    return ContextMonitorService.instance;
  }

  private loadSession(): void {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        const data = fs.readFileSync(this.sessionFilePath, 'utf-8');
        this.sessionHistory = JSON.parse(data);
      }
    } catch (err) {
      log.warn(`[ContextMonitor] Failed to load session: ${(err as Error).message}`);
      this.sessionHistory = [];
    }
  }

  private saveSession(): void {
    try {
      fs.writeFileSync(this.sessionFilePath, JSON.stringify(this.sessionHistory, null, 2));
    } catch (err) {
      log.warn(`[ContextMonitor] Failed to save session: ${(err as Error).message}`);
    }
  }

  private getTokenizer(model: string): Tiktoken {
    if (this.tokenizer) {
      return this.tokenizer;
    }

    try {
      // Try to get model-specific encoding
      if (model.includes('gpt-4')) {
        this.tokenizer = encoding_for_model('gpt-4' as any);
      } else if (model.includes('gpt-3.5')) {
        this.tokenizer = encoding_for_model('gpt-3.5-turbo' as any);
      } else {
        // Default to cl100k_base (used by GPT-4 and GPT-3.5-turbo)
        this.tokenizer = get_encoding('cl100k_base');
      }
    } catch (error) {
      log.warn(`Could not load tokenizer for ${model}, using default`);
      this.tokenizer = get_encoding('cl100k_base');
    }

    return this.tokenizer;
  }

  /**
   * Count tokens in text using tiktoken
   */
  countTokens(text: string, model?: string): number {
    try {
      const config = configService.load();
      const modelName = model || config.defaults.model || 'gpt-4';
      const tokenizer = this.getTokenizer(modelName);
      
      const tokens = tokenizer.encode(text);
      return tokens.length;
    } catch {
      // Fallback to rough estimation: ~4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Record usage with automatic token counting
   */
  recordUsageFromText(prompt: string, completion: string, operation: string): void {
    const inputTokens = this.countTokens(prompt);
    const outputTokens = this.countTokens(completion);
    
    log.info(`[ContextMonitor] Recording usage. Prompt: ${inputTokens} tokens, Completion: ${outputTokens} tokens, Operation: ${operation}`);
    
    this.recordTokenUsage(inputTokens, outputTokens, operation);
  }

  private getModelContextWindow(model: string): number {
    const config = configService.load();
    
    // Check if user has defined contextWindow in config
    const defaults = config.defaults as Record<string, unknown> | undefined;
    if (defaults && typeof defaults.contextWindow === 'number') {
      return defaults.contextWindow;
    }

    // Simple pattern matching for common models (only major families)
    const modelLower = model.toLowerCase();
    
    // Claude models (very large context)
    if (modelLower.includes('claude')) {
      return 200000;
    }
    
    // GPT-4 variants
    if (modelLower.includes('gpt-4-turbo') || modelLower.includes('gpt-4-32k')) {
      return modelLower.includes('32k') ? 32768 : 128000;
    }
    if (modelLower.includes('gpt-4')) {
      return 8192;
    }
    
    // GPT-3.5 variants
    if (modelLower.includes('gpt-3.5')) {
      return modelLower.includes('16k') ? 16384 : 4096;
    }
    
    // Gemini models
    if (modelLower.includes('gemini')) {
      return 32768;
    }
    
    // DeepSeek models
    if (modelLower.includes('deepseek')) {
      return 64000;
    }
    
    // Llama models
    if (modelLower.includes('llama')) {
      return 8192;
    }
    
    // Qwen models
    if (modelLower.includes('qwen')) {
      return 32768;
    }
    
    // Default: modern models typically have 8K+
    const defaultContextWindow = 8192;
    log.info(`[ContextMonitor] Unknown model "${model}", using default ${defaultContextWindow} tokens. To set custom value, add "contextWindow" to config.json defaults.`);
    return defaultContextWindow;
  }

  recordTokenUsage(inputTokens: number, outputTokens: number, operation: string): void {
    const record: TokenUsageRecord = {
      timestamp: Date.now(),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      operation,
    };

    this.sessionHistory.push(record);
    
    const totalSessionTokens = this.sessionHistory.reduce((sum, r) => sum + r.totalTokens, 0);
    log.info(`[ContextMonitor] Token usage recorded. New session total: ${totalSessionTokens} tokens (History size: ${this.sessionHistory.length} records)`);

    // Keep only last 100 records to avoid memory issues
    if (this.sessionHistory.length > 100) {
      this.sessionHistory.shift();
    }

    // Persist to disk
    this.saveSession();
  }

  getStats(): ContextWindowStats {
    const config = configService.load();
    const model = config.defaults.model || 'gpt-4';
    const modelContextWindow = this.getModelContextWindow(model);

    // Calculate total tokens used in session
    const currentSessionTokens = this.sessionHistory.reduce(
      (sum, record) => sum + record.totalTokens,
      0
    );

    const usagePercentage = (currentSessionTokens / modelContextWindow) * 100;

    // Estimate remaining turns based on average token usage
    let estimatedRemainingTurns = 0;
    if (this.sessionHistory.length > 0) {
      const avgTokensPerTurn =
        currentSessionTokens / this.sessionHistory.length;
      const remainingTokens = modelContextWindow - currentSessionTokens;
      estimatedRemainingTurns = Math.floor(remainingTokens / avgTokensPerTurn);
    } else {
      // If no history, assume average turn is 2000 tokens
      estimatedRemainingTurns = Math.floor(
        (modelContextWindow - currentSessionTokens) / 2000
      );
    }

    // Determine warning level
    let warningLevel: ContextWindowStats['warningLevel'] = 'safe';
    if (usagePercentage >= 95) {
      warningLevel = 'critical';
    } else if (usagePercentage >= 85) {
      warningLevel = 'warning';
    }

    return {
      modelContextWindow,
      currentSessionTokens,
      usagePercentage: Math.round(usagePercentage * 10) / 10,
      estimatedRemainingTurns: Math.max(0, estimatedRemainingTurns),
      warningLevel,
    };
  }

  getWarningMessage(): string | null {
    const stats = this.getStats();

    if (stats.warningLevel === 'critical') {
      return `🚨 CRITICAL: You've used ${stats.usagePercentage}% of context window! (~${stats.estimatedRemainingTurns} turns left). Please summarize or restart the session.`;
    } else if (stats.warningLevel === 'warning') {
      return `⚠️ WARNING: You've used ${stats.usagePercentage}% of context window (~${stats.estimatedRemainingTurns} turns left). Consider summarizing soon.`;
    }

    return null;
  }

  getSessionSummary(): string {
    if (this.sessionHistory.length === 0) {
      return 'No operations recorded in this session.';
    }

    const stats = this.getStats();
    const totalOperations = this.sessionHistory.length;
    const avgTokensPerOp =
      stats.currentSessionTokens / totalOperations;

    return `
📊 Session Summary:
• Total Operations: ${totalOperations}
• Total Tokens Used: ${stats.currentSessionTokens.toLocaleString()}
• Average per Operation: ${Math.round(avgTokensPerOp).toLocaleString()} tokens
• Context Window: ${stats.modelContextWindow.toLocaleString()} tokens
• Usage: ${stats.usagePercentage}%
• Estimated Remaining Turns: ${stats.estimatedRemainingTurns}
• Status: ${stats.warningLevel === 'safe' ? '✅ Safe' : stats.warningLevel === 'warning' ? '⚠️ Warning' : '🚨 Critical'}
    `.trim();
  }

  resetSession(): void {
    this.sessionHistory = [];
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        fs.unlinkSync(this.sessionFilePath);
      }
    } catch (err) {
      log.warn(`[ContextMonitor] Failed to delete session file: ${(err as Error).message}`);
    }
    log.info('🔄 Context monitoring session reset');
  }

  getRecentOperations(count: number = 10): TokenUsageRecord[] {
    return this.sessionHistory.slice(-count);
  }

  exportStats(): string {
    const stats = this.getStats();
    return JSON.stringify({
      stats,
      history: this.sessionHistory,
      timestamp: new Date().toISOString(),
    }, null, 2);
  }
}

export const contextMonitorService = ContextMonitorService.getInstance();
