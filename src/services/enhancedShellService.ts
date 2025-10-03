import { ShellService, ShellCommandOptions, ShellResult } from './shellService.js';
import { log } from '../utils/logger.js';

interface CommandPreset {
  name: string;
  command: string;
  description: string;
  platforms: string[];
}

const DEV_COMMANDS: CommandPreset[] = [
  {
    name: 'git-status',
    command: 'git status',
    description: 'Git status',
    platforms: ['win32', 'linux', 'darwin'],
  },
  {
    name: 'git-log',
    command: 'git log --oneline -10',
    description: 'Recent commits',
    platforms: ['win32', 'linux', 'darwin'],
  },
  {
    name: 'npm-install',
    command: 'npm install',
    description: 'Install dependencies',
    platforms: ['win32', 'linux', 'darwin'],
  },
  {
    name: 'npm-test',
    command: 'npm test',
    description: 'Run tests',
    platforms: ['win32', 'linux', 'darwin'],
  },
  {
    name: 'npm-build',
    command: 'npm run build',
    description: 'Build project',
    platforms: ['win32', 'linux', 'darwin'],
  },
  { name: 'ps-list', command: 'Get-Process', description: 'List processes', platforms: ['win32'] },
  {
    name: 'ps-top',
    command: 'top -n 1',
    description: 'System resources',
    platforms: ['linux', 'darwin'],
  },
];

export class EnhancedShellService extends ShellService {
  private static enhancedInstance: EnhancedShellService;

  static getEnhancedInstance(): EnhancedShellService {
    if (!EnhancedShellService.enhancedInstance) {
      EnhancedShellService.enhancedInstance = new EnhancedShellService();
    }
    return EnhancedShellService.enhancedInstance;
  }

  async executePreset(presetName: string, options: ShellCommandOptions = {}): Promise<ShellResult> {
    const preset = DEV_COMMANDS.find((p) => p.name === presetName);

    if (!preset) {
      return {
        success: false,
        stdout: '',
        stderr: `Preset '${presetName}' not found`,
        exitCode: null,
        error: 'Preset not found',
      };
    }

    if (!preset.platforms.includes(process.platform)) {
      return {
        success: false,
        stdout: '',
        stderr: `Preset '${presetName}' not supported on ${process.platform}`,
        exitCode: null,
        error: 'Platform not supported',
      };
    }

    log.info(`Executing preset: ${preset.name}`);
    return await this.executeCommand(preset.command, options);
  }

  async executeAdaptive(command: string, options: ShellCommandOptions = {}): Promise<ShellResult> {
    const platform = process.platform;
    let adaptedCommand = command;
    const adaptedOptions: ShellCommandOptions = { ...options };

    if (platform === 'win32') {
      adaptedCommand = this.adaptToWindows(command);
      adaptedOptions.shell = adaptedOptions.shell || 'powershell';
    } else {
      adaptedCommand = this.adaptToUnix(command);
      adaptedOptions.shell = adaptedOptions.shell || 'bash';
    }

    log.info(`Adapted command: ${adaptedCommand}`);
    return await this.executeCommand(adaptedCommand, adaptedOptions);
  }

  private adaptToWindows(command: string): string {
    const replacements: Record<string, string> = {
      ls: 'dir',
      cat: 'type',
      rm: 'del',
      mv: 'move',
      cp: 'copy',
      pwd: 'cd',
      clear: 'cls',
      ps: 'Get-Process',
      kill: 'Stop-Process',
    };

    let adapted = command;
    for (const [unix, windows] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${unix}\\b`, 'g');
      adapted = adapted.replace(regex, windows);
    }

    return adapted;
  }

  private adaptToUnix(command: string): string {
    const replacements: Record<string, string> = {
      dir: 'ls',
      type: 'cat',
      del: 'rm',
      move: 'mv',
      copy: 'cp',
      cls: 'clear',
    };

    let adapted = command;
    for (const [windows, unix] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${windows}\\b`, 'g');
      adapted = adapted.replace(regex, unix);
    }

    return adapted;
  }

  getAvailablePresets(): CommandPreset[] {
    return DEV_COMMANDS.filter((p) => p.platforms.includes(process.platform));
  }

  async executePipeline(
    commands: string[],
    options: ShellCommandOptions = {}
  ): Promise<ShellResult[]> {
    const results: ShellResult[] = [];
    let previousOutput = '';

    for (const command of commands) {
      const cmdOptions = { ...options };

      if (previousOutput && command.includes('$PREV')) {
        const adaptedCommand = command.replace(/\$PREV/g, previousOutput.trim());
        const result = await this.executeCommand(adaptedCommand, cmdOptions);
        results.push(result);
        previousOutput = result.stdout;
      } else {
        const result = await this.executeCommand(command, cmdOptions);
        results.push(result);
        previousOutput = result.stdout;
      }

      if (!results[results.length - 1].success && !options.continueOnError) {
        break;
      }
    }

    return results;
  }
}

export const enhancedShellService = EnhancedShellService.getEnhancedInstance();
