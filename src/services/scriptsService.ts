import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { log } from '../utils/logger.js';
import { ShellService } from './shellService.js';

interface ScriptConfig {
  scripts: Record<string, string | string[]>;
  security?: {
    allowedCommands?: string[];
    blockedPatterns?: string[];
    maxExecutionTime?: number;
    requireConfirmation?: string[];
  };
}

interface ScriptExecutionOptions {
  args?: string[];
  skipConfirmation?: boolean;
}

export class ScriptsService {
  private static instance: ScriptsService;
  private config: ScriptConfig | null = null;
  private shellService: ShellService;

  private constructor() {
    this.shellService = ShellService.getInstance();
  }

  static getInstance(): ScriptsService {
    if (!ScriptsService.instance) {
      ScriptsService.instance = new ScriptsService();
    }
    return ScriptsService.instance;
  }

  private loadConfig(): ScriptConfig {
    if (this.config) {
      return this.config;
    }

    const configPath = path.join(process.cwd(), '.sentineltm', 'config', 'scripts.yml');

    if (!fs.existsSync(configPath)) {
      log.warn('📜 No scripts.yml found. Creating default configuration...');
      this.createDefaultConfig(configPath);
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      this.config = yaml.parse(content) as ScriptConfig;
      return this.config;
    } catch (error) {
      log.error(
        `❌ Failed to load scripts configuration: ${error instanceof Error ? error.message : String(error)}`
      );
      return { scripts: {} };
    }
  }

  private createDefaultConfig(configPath: string): void {
    const defaultConfig = {
      scripts: {
        install: 'npm install',
        test: 'npm test',
        build: 'npm run build',
        dev: 'npm run dev',
        status: 'git status',
        commit: 'git commit -m "$1"',
        gate: 'st gate run',
        dashboard: 'st dashboard report',
      },
      security: {
        allowedCommands: ['npm', 'git', 'st', 'echo', 'node'],
        blockedPatterns: ['rm -rf', 'sudo', 'chmod', 'del /f', 'format'],
        maxExecutionTime: 300,
        requireConfirmation: ['deploy', 'release'],
      },
    };

    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, yaml.stringify(defaultConfig));
      log.success(`✅ Created default scripts configuration at ${configPath}`);
    } catch (error) {
      log.error(
        `❌ Failed to create default config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  listScripts(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.scripts);
  }

  getScript(name: string): string | string[] | undefined {
    const config = this.loadConfig();
    return config.scripts[name];
  }

  private validateSecurity(command: string): boolean {
    const config = this.loadConfig();
    const security = config.security;

    if (!security) {
      return true; // No security config = allow all
    }

    // Check blocked patterns
    if (security.blockedPatterns) {
      for (const pattern of security.blockedPatterns) {
        if (command.toLowerCase().includes(pattern.toLowerCase())) {
          log.error(`🚫 Command blocked by security policy: "${pattern}"`);
          return false;
        }
      }
    }

    // Check allowed commands
    if (security.allowedCommands) {
      const commandName = command.split(' ')[0];
      if (!security.allowedCommands.includes(commandName)) {
        log.error(`🚫 Command not in allowed list: "${commandName}"`);
        return false;
      }
    }

    return true;
  }

  private substituteParameters(command: string, args: string[] = []): string {
    let result = command;

    // Replace $1, $2, etc. with provided arguments
    args.forEach((arg, index) => {
      const placeholder = `$${index + 1}`;
      result = result.replace(new RegExp(`\\${placeholder}`, 'g'), arg);
    });

    // Check for unsubstituted parameters
    const unresolvedParams = result.match(/\$\d+/g);
    if (unresolvedParams) {
      throw new Error(`Missing arguments for parameters: ${unresolvedParams.join(', ')}`);
    }

    return result;
  }

  private async confirmExecution(scriptName: string): Promise<boolean> {
    const config = this.loadConfig();
    const requireConfirmation = config.security?.requireConfirmation || [];

    if (!requireConfirmation.includes(scriptName)) {
      return true; // No confirmation required
    }

    log.warn(`⚠️ Script "${scriptName}" requires confirmation.`);
    log.warn('This script may perform potentially destructive operations.');

    // In a real implementation, you might want to use a proper prompt library
    // For now, we'll assume confirmation is given
    log.info('Use --force flag to skip confirmation in the future.');
    return true;
  }

  async executeScript(scriptName: string, options: ScriptExecutionOptions = {}): Promise<boolean> {
    const script = this.getScript(scriptName);

    if (!script) {
      log.error(`❌ Script "${scriptName}" not found.`);
      log.info(`Available scripts: ${this.listScripts().join(', ')}`);
      return false;
    }

    // Check confirmation requirement
    if (!options.skipConfirmation) {
      const confirmed = await this.confirmExecution(scriptName);
      if (!confirmed) {
        log.warn('Script execution cancelled by user.');
        return false;
      }
    }

    log.info(`🚀 Executing script: ${scriptName}`);

    try {
      if (Array.isArray(script)) {
        // Execute multiple commands in sequence
        for (const command of script) {
          const success = await this.executeSingleCommand(command, options.args);
          if (!success) {
            log.error(`❌ Script "${scriptName}" failed at command: ${command}`);
            return false;
          }
        }
        return true;
      } else {
        // Execute single command
        return await this.executeSingleCommand(script, options.args);
      }
    } catch (error) {
      log.error(
        `❌ Script execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  private async executeSingleCommand(command: string, args: string[] = []): Promise<boolean> {
    try {
      // Substitute parameters
      const resolvedCommand = this.substituteParameters(command, args);

      // Validate security
      if (!this.validateSecurity(resolvedCommand)) {
        return false;
      }

      log.info(`  → ${resolvedCommand}`);

      // Execute command
      const result = await this.shellService.executeCommand(resolvedCommand, {
        timeout: (this.loadConfig().security?.maxExecutionTime || 300) * 1000, // Convert to milliseconds
      });

      if (result.success) {
        if (result.stdout.trim()) {
          log.info(result.stdout.trim());
        }
        return true;
      } else {
        if (result.stderr.trim()) {
          log.error(result.stderr.trim());
        }
        return false;
      }
    } catch (error) {
      log.error(
        `Command execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  addScript(name: string, commands: string | string[]): boolean {
    try {
      const config = this.loadConfig();
      config.scripts[name] = commands;

      const configPath = path.join(process.cwd(), '.sentineltm', 'config', 'scripts.yml');
      fs.writeFileSync(configPath, yaml.stringify(config));

      // Invalidate cache
      this.config = null;

      log.success(`✅ Added script "${name}"`);
      return true;
    } catch (error) {
      log.error(
        `❌ Failed to add script: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  removeScript(name: string): boolean {
    try {
      const config = this.loadConfig();

      if (!config.scripts[name]) {
        log.warn(`Script "${name}" not found.`);
        return false;
      }

      delete config.scripts[name];

      const configPath = path.join(process.cwd(), '.sentineltm', 'config', 'scripts.yml');
      fs.writeFileSync(configPath, yaml.stringify(config));

      // Invalidate cache
      this.config = null;

      log.success(`✅ Removed script "${name}"`);
      return true;
    } catch (error) {
      log.error(
        `❌ Failed to remove script: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}

export const scriptsService = ScriptsService.getInstance();
