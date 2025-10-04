import { configService } from './configService.js';
import { log } from '../utils/logger.js';

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
  private modelContextWindows: Record<string, number> = {
    // OpenAI models
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,
    // Anthropic models
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,
    'claude-2': 100000,
    // Google models
    'gemini-pro': 32768,
    'gemini-ultra': 32768,
    // OpenRouter (various)
    'openrouter/auto': 128000,
    // Default fallback
    'default': 4096,
  };

  static getInstance(): ContextMonitorService {
    if (!ContextMonitorService.instance) {
      ContextMonitorService.instance = new ContextMonitorService();
    }
    return ContextMonitorService.instance;
  }

  private getModelContextWindow(model: string): number {
    // Try exact match first
    if (this.modelContextWindows[model]) {
      return this.modelContextWindows[model];
    }

    // Try partial match
    for (const [key, value] of Object.entries(this.modelContextWindows)) {
      if (model.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Default fallback
    log.warn(`Unknown model context window for "${model}", using default 4096`);
    return this.modelContextWindows.default;
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

    // Keep only last 100 records to avoid memory issues
    if (this.sessionHistory.length > 100) {
      this.sessionHistory.shift();
    }
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
