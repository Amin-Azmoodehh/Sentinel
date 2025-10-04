import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { log } from '../utils/logger.js';

export interface FriendlyConfig {
  personality: {
    tone: 'formal' | 'concise' | 'enthusiastic_partner' | 'professional_friend';
    use_emojis: boolean;
    user_name: string;
    initial_greeting: string;
    encouragement: {
      on_success: string[];
      on_good_idea: string[];
      on_challenge: string[];
    };
  };
  interaction_rules: {
    praise_user_ideas: boolean;
    suggest_next_steps: boolean;
    explain_simply: boolean;
    use_collaborative_language: boolean;
    suggestion_engine: {
      frequency: 'always' | 'sometimes' | 'rare';
      style: 'standard_improvement' | 'out_of_the_box' | 'innovative';
      timing: string[];
    };
  };
  aliases: Record<string, string>;
  preferences: Record<string, any>;
  context_awareness: {
    learn_from_history: boolean;
    remember: string[];
    common_workflows: Array<{
      name: string;
      steps: string[];
    }>;
  };
  custom_messages: Record<string, string>;
  boundaries: {
    never_modify: string[];
    always_confirm: string[];
  };
  smart_reminders: Array<{
    condition: string;
    message: string;
  }>;
}

export class FriendlyService {
  private static instance: FriendlyService;
  private config: FriendlyConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'friendly.yml');
  }

  static getInstance(): FriendlyService {
    if (!FriendlyService.instance) {
      FriendlyService.instance = new FriendlyService();
    }
    return FriendlyService.instance;
  }

  loadConfig(): FriendlyConfig | null {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      log.warn('⚠️ No friendly.yml found. Using default interaction mode.');
      return null;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      this.config = yaml.parse(content) as FriendlyConfig;
      return this.config;
    } catch (error) {
      log.error(`❌ Failed to load friendly.yml: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  translateAlias(input: string): string {
    const config = this.loadConfig();
    if (!config || !config.aliases) {
      return input;
    }

    // Check if input matches an alias
    for (const [alias, command] of Object.entries(config.aliases)) {
      if (input.startsWith(alias)) {
        // Extract arguments after alias
        const args = input.slice(alias.length).trim().split(' ');
        
        // Replace $1, $2, etc. with actual arguments
        let translatedCommand = command;
        args.forEach((arg, index) => {
          translatedCommand = translatedCommand.replace(`$${index + 1}`, arg);
        });
        
        // Handle ${N:-default} syntax
        translatedCommand = translatedCommand.replace(/\$\{(\d+):-([^}]+)\}/g, (match, num, defaultVal) => {
          const argIndex = parseInt(num) - 1;
          return args[argIndex] || defaultVal;
        });
        
        return translatedCommand;
      }
    }

    return input;
  }

  formatMessage(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): string {
    const config = this.loadConfig();
    if (!config) {
      return message;
    }

    const { personality, interaction_rules } = config;
    let formattedMessage = message;

    // Apply tone
    if (personality.tone === 'enthusiastic_partner' && personality.use_emojis) {
      // Message is already formatted, just ensure proper style
      if (type === 'success' && !formattedMessage.includes('✅') && !formattedMessage.includes('🎉')) {
        formattedMessage = `✅ ${formattedMessage}`;
      }
    } else if (personality.tone === 'formal') {
      // Remove emojis for formal tone
      formattedMessage = formattedMessage.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    }

    // Apply collaborative language
    if (interaction_rules.use_collaborative_language) {
      formattedMessage = formattedMessage
        .replace(/\bYou should\b/gi, "Let's")
        .replace(/\bYou need to\b/gi, "We need to")
        .replace(/\bYou can\b/gi, "We can");
    }

    return formattedMessage;
  }

  getGreeting(): string {
    const config = this.loadConfig();
    if (!config) {
      return 'Hello! How can I help you today?';
    }

    const hour = new Date().getHours();
    const { custom_messages, personality } = config;

    if (hour >= 5 && hour < 12 && custom_messages.morning_greeting) {
      return custom_messages.morning_greeting;
    } else if (hour >= 12 && hour < 18 && custom_messages.afternoon_greeting) {
      return custom_messages.afternoon_greeting;
    } else if (custom_messages.evening_greeting) {
      return custom_messages.evening_greeting;
    }

    return personality.initial_greeting;
  }

  getRandomEncouragement(type: 'on_success' | 'on_good_idea' | 'on_challenge'): string {
    const config = this.loadConfig();
    if (!config || !config.personality.encouragement[type]) {
      return '';
    }

    const messages = config.personality.encouragement[type];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  shouldPraiseIdea(): boolean {
    const config = this.loadConfig();
    return config?.interaction_rules.praise_user_ideas ?? false;
  }

  shouldSuggestNextSteps(): boolean {
    const config = this.loadConfig();
    return config?.interaction_rules.suggest_next_steps ?? false;
  }

  getUserName(): string {
    const config = this.loadConfig();
    return config?.personality.user_name || 'there';
  }

  getPreference(key: string, defaultValue?: any): any {
    const config = this.loadConfig();
    if (!config || !config.preferences) {
      return defaultValue;
    }

    const keys = key.split('.');
    let value: any = config.preferences;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value ?? defaultValue;
  }

  checkBoundary(operation: string, target: string): { allowed: boolean; needsConfirmation: boolean; reason?: string } {
    const config = this.loadConfig();
    if (!config || !config.boundaries) {
      return { allowed: true, needsConfirmation: false };
    }

    const { never_modify, always_confirm } = config.boundaries;

    // Check never_modify list
    for (const pattern of never_modify) {
      if (target.includes(pattern)) {
        return {
          allowed: false,
          needsConfirmation: false,
          reason: `Protected path: ${pattern} should never be modified.`,
        };
      }
    }

    // Check always_confirm list
    for (const pattern of always_confirm) {
      if (operation.includes(pattern) || target.includes(pattern)) {
        return {
          allowed: true,
          needsConfirmation: true,
          reason: `This operation requires confirmation: ${pattern}`,
        };
      }
    }

    return { allowed: true, needsConfirmation: false };
  }

  getSmartReminders(context: Record<string, any>): string[] {
    const config = this.loadConfig();
    if (!config || !config.smart_reminders) {
      return [];
    }

    const reminders: string[] = [];

    for (const reminder of config.smart_reminders) {
      // Simple condition evaluation
      const conditionMet = this.evaluateCondition(reminder.condition, context);
      if (conditionMet) {
        reminders.push(reminder.message);
      }
    }

    return reminders;
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Simple condition evaluator
    try {
      // Parse conditions like "tokens_used > 90%"
      const match = condition.match(/(\w+)\s*(>|<|=|>=|<=)\s*(\d+)(%?)/);
      if (match) {
        const [, variable, operator, valueStr, isPercent] = match;
        const value = parseFloat(valueStr);
        const contextValue = context[variable];

        if (contextValue === undefined) return false;

        const actualValue = isPercent ? contextValue * 100 : contextValue;

        switch (operator) {
          case '>': return actualValue > value;
          case '<': return actualValue < value;
          case '>=': return actualValue >= value;
          case '<=': return actualValue <= value;
          case '=': return actualValue === value;
          default: return false;
        }
      }

      // Handle boolean conditions
      if (condition in context) {
        return Boolean(context[condition]);
      }

      return false;
    } catch {
      return false;
    }
  }

  listAliases(): Array<{ alias: string; command: string }> {
    const config = this.loadConfig();
    if (!config || !config.aliases) {
      return [];
    }

    return Object.entries(config.aliases).map(([alias, command]) => ({
      alias,
      command,
    }));
  }

  getWorkflow(name: string): Array<string> | null {
    const config = this.loadConfig();
    if (!config || !config.context_awareness.common_workflows) {
      return null;
    }

    const workflow = config.context_awareness.common_workflows.find(w => w.name === name);
    return workflow?.steps || null;
  }
}

export const friendlyService = FriendlyService.getInstance();
