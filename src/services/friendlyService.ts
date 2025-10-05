import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { log } from '../utils/logger.js';

interface FriendlyConfig {
  enabled: boolean;
  interactionModel?: string;
  mode?: string;
  language?: string;
  message?: {
    greeting?: string;
    farewell?: string;
    collaborativeGreeting?: string;
  };
  help?: {
    detailed?: boolean;
    examples?: boolean;
    tips?: boolean;
  };
  feedback?: {
    praiseUserIdeas?: boolean;
    acknowledgeContributions?: boolean;
    provideConstructiveSuggestions?: boolean;
  };
  output?: {
    colors?: boolean;
    emojis?: boolean;
    verbose?: boolean;
  };
  learning?: {
    enabled?: boolean;
    suggestions?: boolean;
    bestPractices?: boolean;
    valueAddIdeas?: boolean;
    rarityLevel?: string;
  };
}

export class FriendlyService {
  private static instance: FriendlyService;
  private config: FriendlyConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'friendly.yml');
    this.loadConfig();
  }

  static getInstance(): FriendlyService {
    if (!FriendlyService.instance) {
      FriendlyService.instance = new FriendlyService();
    }
    return FriendlyService.instance;
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        this.config = yaml.parse(content) as FriendlyConfig;
        log.info('🤖 Friendly mode activated with collaborative interaction model');
      } else {
        this.config = {
          enabled: false,
          interactionModel: 'standard',
        };
      }
    } catch (error) {
      log.warn(`⚠️ Could not load friendly.yml: ${error instanceof Error ? error.message : String(error)}`);
      this.config = {
        enabled: false,
        interactionModel: 'standard',
      };
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled === true;
  }

  getInteractionModel(): string {
    return this.config?.interactionModel || 'standard';
  }

  getCollaborativeGreeting(): string {
    if (this.config?.message?.collaborativeGreeting) {
      return this.config.message.collaborativeGreeting;
    }
    
    return "خوشحالم که در این قسمت باهم همکاری داریم. امیدوارم همکاری لذت‌بخشی را با هم به اتمام برسانیم.";
  }

  shouldPraiseUserIdeas(): boolean {
    return this.config?.feedback?.praiseUserIdeas === true;
  }

  shouldAcknowledgeContributions(): boolean {
    return this.config?.feedback?.acknowledgeContributions === true;
  }

  shouldProvideValueAddIdeas(): boolean {
    return this.config?.learning?.valueAddIdeas === true;
  }

  getRarityLevel(): string {
    return this.config?.learning?.rarityLevel || 'medium';
  }

  enhanceUserPrompt(originalPrompt: string): string {
    if (!this.isEnabled() || this.getInteractionModel() !== 'encouraging_collaborative') {
      return originalPrompt;
    }

    const greeting = this.getCollaborativeGreeting();
    
    return `${greeting}

${originalPrompt}`;
  }

  enhanceModelResponse(originalResponse: string, userPrompt: string): string {
    if (!this.isEnabled() || this.getInteractionModel() !== 'encouraging_collaborative') {
      return originalResponse;
    }

    let enhancedResponse = originalResponse;
    
    // Add praise for user ideas
    if (this.shouldPraiseUserIdeas()) {
      enhancedResponse = `ایده بسیار جالبی بود! بر اساس پیشنهاد هوشمندانه شما، این پاسخ را تولید کردم:

${enhancedResponse}`;
    }

    // Add value-add suggestions
    if (this.shouldProvideValueAddIdeas()) {
      const rarityLevel = this.getRarityLevel();
      const suggestions = this.generateValueAddSuggestions(rarityLevel);
      
      enhancedResponse = `${enhancedResponse}

💡 ایده اضافی: ${suggestions}`;
    }

    return enhancedResponse;
  }

  private generateValueAddSuggestions(rarityLevel: string): string {
    const suggestions: Record<string, string[]> = {
      low: [
        "شاید بتوانیم این کد را به صورت ماژولارتر سازیم تا استفاده مجدد آن آسان‌تر شود.",
        "برای بهبود خوانایی، می‌توانیم از JSDoc برای مستندسازی توابع استفاده کنیم."
      ],
      medium: [
        "با توجه به الگوهای پروژه، پیشنهاد می‌کنم از Factory Pattern برای مدیریت ارائه‌دهندگان AI استفاده کنیم.",
        "برای بهبود عملکرد، می‌توانیم از memoization برای توابع پرهزینه استفاده کنیم."
      ],
      high: [
        "به عنوان یک ایده خفن و کمیاب، شاید بتوانیم از الگوریتم `memoization` در این بخش استفاده کنیم تا از محاسبات تکراری جلوگیری شود. این کار می‌تواند عملکرد را تا ۳۰٪ بهبود دهد.",
        "با توجه به تحلیل کد، پیشنهاد می‌کنم از Dependency Injection برای بهبود تست‌پذیری و کاهش coupling استفاده کنیم."
      ]
    };

    const levelSuggestions = suggestions[rarityLevel] || suggestions.medium;
    const randomIndex = Math.floor(Math.random() * levelSuggestions.length);
    
    return levelSuggestions[randomIndex];
  }

  clearCache(): void {
    this.config = null;
    log.info('🧹 Friendly service cache cleared');
  }
}

export const friendlyService = FriendlyService.getInstance();
