import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { log } from '../utils/logger.js';
import { configService } from './configService.js';

export interface ShellCommandOptions {
  shell?: string;
  cwd?: string;
  timeout?: number;
  maxOutputSize?: number;
  allowedCommands?: string[];
  blockedCommands?: string[];
  isProviderCommand?: boolean;
  input?: string;
  continueOnError?: boolean;
}

export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

export interface ShellDetectionResult {
  availableShells: string[];
  defaultShell: string;
  platform: string;
}

const DEFAULT_TIMEOUT = 300000; // 5 minutes
const DEFAULT_MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

export class ShellService {
  private static instance: ShellService;
  private activeProcesses: Map<string, ChildProcess> = new Map();

  static getInstance(): ShellService {
    if (!ShellService.instance) {
      ShellService.instance = new ShellService();
    }
    return ShellService.instance;
  }

  detectAvailableShells(): ShellDetectionResult {
    const availableShells: string[] = [];
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows shells
      const windowsShells = ['powershell', 'cmd', 'pwsh'];
      windowsShells.forEach((shell) => {
        if (this.isShellAvailable(shell)) {
          availableShells.push(shell);
        }
      });
      return {
        availableShells,
        defaultShell: availableShells.includes('powershell') ? 'powershell' : 'cmd',
        platform,
      };
    } else {
      // Unix-like shells
      const unixShells = ['bash', 'zsh', 'fish', 'sh', 'dash'];
      unixShells.forEach((shell) => {
        if (this.isShellAvailable(shell)) {
          availableShells.push(shell);
        }
      });
      return {
        availableShells,
        defaultShell: availableShells.includes('bash') ? 'bash' : 'sh',
        platform,
      };
    }
  }

  private isShellAvailable(shell: string): boolean {
    try {
      const result = spawnSync(shell, ['--version'], {
        timeout: 2000,
        shell: false,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      return result.status === 0 || result.error === undefined;
    } catch {
      return false;
    }
  }

  async executeCommandAsync(command: string, options: ShellCommandOptions = {}): Promise<number> {
    // Start command in background and return process ID
    const validation = this.validateCommand(command, options);
    if (!validation.valid) {
      throw new Error(validation.error || 'Command validation failed');
    }

    const shell = options.shell || this.getDefaultShell();
    const cwd = options.cwd || process.cwd();

    let shellArgs: string[];
    let shellCommand: string;

    if (process.platform === 'win32') {
      const lower = shell.toLowerCase();
      if (lower.includes('powershell')) {
        shellCommand = shell;
        shellArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command];
      } else {
        shellCommand = shell;
        shellArgs = ['/c', command];
      }
    } else {
      shellCommand = shell;
      shellArgs = ['-c', command];
    }

    const { spawn } = await import('node:child_process');
    const child = spawn(shellCommand, shellArgs, {
      cwd,
      detached: true,
      stdio: 'ignore'
    });

    child.unref(); // Allow parent to exit without waiting for child
    return child.pid || 0;
  }

  async executeCommand(command: string, options: ShellCommandOptions = {}): Promise<ShellResult> {
    try {
      // Validate command
      const validation = this.validateCommand(command, options);
      if (!validation.valid) {
        return {
          success: false,
          stdout: '',
          stderr: validation.error || '',
          exitCode: null,
          error: validation.error,
        };
      }

      const shell = options.shell || this.getDefaultShell();
      const cwd = options.cwd || process.cwd();
      const timeout = options.timeout || DEFAULT_TIMEOUT;
      const maxOutputSize = options.maxOutputSize || DEFAULT_MAX_OUTPUT_SIZE;

      // Prepare shell arguments (shell:false for precise control)
      let shellArgs: string[];
      let shellCommand: string;

      if (process.platform === 'win32') {
        const lower = shell.toLowerCase();
        if (lower.includes('powershell')) {
          shellCommand = shell;
          shellArgs = [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            command,
          ];
        } else {
          // cmd.exe
          shellCommand = shell;
          shellArgs = ['/c', command];
        }
      } else {
        shellCommand = shell;
        shellArgs = ['-c', command];
      }

      return await new Promise<ShellResult>((resolve) => {
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        let outputSize = 0;

        const childProcess = spawn(shellCommand, shellArgs, {
          cwd,
          env: { ...process.env },
          shell: false,
        });

        const processId = `${Date.now()}-${Math.random()}`;
        this.activeProcesses.set(processId, childProcess);

        // Hard timeout guard: kill process and resolve
        const timeoutTimer = setTimeout(() => {
          try {
            childProcess.kill();
          } catch {}
          this.activeProcesses.delete(processId);
          resolve({
            success: false,
            stdout,
            stderr: stderr + `\nCommand timed out`,
            exitCode: null,
            error: `Command timed out after ${timeout}ms`,
          });
        }, timeout);

        if (options.input) {
          childProcess.stdin?.write(options.input);
          childProcess.stdin?.end();
        }

        childProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          outputSize += Buffer.byteLength(chunk);

          if (outputSize > maxOutputSize) {
            childProcess.kill();
            resolve({
              success: false,
              stdout,
              stderr,
              exitCode: null,
              error: `Output size exceeded ${maxOutputSize} bytes limit`,
            });
            return;
          }

          stdout += chunk;
        });

        childProcess.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString();
          outputSize += Buffer.byteLength(chunk);

          if (outputSize > maxOutputSize) {
            childProcess.kill();
            resolve({
              success: false,
              stdout,
              stderr,
              exitCode: null,
              error: `Output size exceeded ${maxOutputSize} bytes limit`,
            });
            return;
          }

          stderr += chunk;
        });

        childProcess.on('close', (code: number | null) => {
          this.activeProcesses.delete(processId);
          clearTimeout(timeoutTimer);

          resolve({
            success: code === 0,
            stdout,
            stderr,
            exitCode: code,
          });
        });

        childProcess.on('error', (error: Error) => {
          this.activeProcesses.delete(processId);
          clearTimeout(timeoutTimer);
          resolve({
            success: false,
            stdout,
            stderr: error.message,
            exitCode: null,
            error: error.message,
          });
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Shell command execution failed: ${errorMessage}`);
      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: null,
        error: errorMessage,
      };
    }
  }

  executeCommandSync(command: string, options: ShellCommandOptions = {}): ShellResult {
    try {
      // Validate command
      const validation = this.validateCommand(command, options);
      if (!validation.valid) {
        return {
          success: false,
          stdout: '',
          stderr: validation.error || '',
          exitCode: null,
          error: validation.error,
        };
      }

      const shell = options.shell || this.getDefaultShell();
      const cwd = options.cwd || process.cwd();
      const timeout = options.timeout || DEFAULT_TIMEOUT;

      let shellArgs: string[];
      let shellCommand: string;

      if (process.platform === 'win32') {
        if (shell.toLowerCase().includes('powershell')) {
          shellArgs = ['-Command', command];
        } else {
          shellArgs = ['/c', command];
        }
        shellCommand = shell;
      } else {
        shellArgs = ['-c', command];
        shellCommand = shell;
      }

      const result = spawnSync(shellCommand, shellArgs, {
        cwd,
        env: { ...process.env },
        timeout: timeout,
        shell: true,
        maxBuffer: options.maxOutputSize || DEFAULT_MAX_OUTPUT_SIZE,
      });

      return {
        success: result.status === 0,
        stdout: result.stdout?.toString() || '',
        stderr: result.stderr?.toString() || '',
        exitCode: result.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Synchronous shell command execution failed: ${errorMessage}`);
      return {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: null,
        error: errorMessage,
      };
    }
  }

  private validateCommand(
    command: string,
    options: ShellCommandOptions
  ): { valid: boolean; error?: string } {
    if (options.isProviderCommand) {
      return { valid: true };
    }

    const config = configService.load();
    const blocked = options.blockedCommands ?? config.security?.shell?.blockedCommands ?? [];
    const allowed = options.allowedCommands ?? config.security?.shell?.allowedCommands ?? [];

    const commandParts = command.trim().split(/\s+/);
    const primaryCommand = commandParts[0].toLowerCase();

    // Extract base command (remove path and extension)
    const baseCommand = path.basename(primaryCommand, path.extname(primaryCommand));

    // Check blocked commands - exact match or starts with
    if (
      blocked.some((blockedCmd: string) => {
        const normalizedBlocked = blockedCmd.toLowerCase();
        return baseCommand === normalizedBlocked || baseCommand.startsWith(normalizedBlocked + '-');
      })
    ) {
      return {
        valid: false,
        error: `Command '${primaryCommand}' is blocked for security reasons`,
      };
    }

    // Check allowed commands - exact match or variant (python3, pip3, etc.)
    if (allowed.length > 0) {
      const isAllowed = allowed.some((allowedCmd: string) => {
        const normalizedAllowed = allowedCmd.toLowerCase();
        return (
          baseCommand === normalizedAllowed ||
          baseCommand.startsWith(normalizedAllowed + '3') || // python3, pip3
          baseCommand.startsWith(normalizedAllowed + '-') // python-config
        );
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `Command '${primaryCommand}' is not in the allowed list`,
        };
      }
    }

    if (this.containsDangerousPattern(command)) {
      return {
        valid: false,
        error: 'Command contains dangerous patterns',
      };
    }

    return { valid: true };
  }

  private containsDangerousPattern(command: string): boolean {
    const dangerousPatterns = [
      /\|\|/,
      /&&/,
      />/,
      />>/,
      /</,
      /;\s*rm/,
      /;\s*mv/,
      /;\s*cp/,
      /;\s*chmod/,
      /;\s*chown/,
      /`.*`/,
      /\$\(.*\)/,
      /eval/,
      /source/,
      /\.\s+\//,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(command));
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      // Try PowerShell first, fallback to cmd
      if (this.isShellAvailable('powershell.exe')) {
        return 'powershell.exe';
      } else if (this.isShellAvailable('pwsh.exe')) {
        return 'pwsh.exe';
      } else {
        return 'cmd.exe';
      }
    } else {
      return 'bash';
    }
  }

  getAvailableShells(): string[] {
    return this.detectAvailableShells().availableShells;
  }

  getDefaultShellInfo(): ShellDetectionResult {
    return this.detectAvailableShells();
  }

  getAllowedCommands(): string[] {
    const config = configService.load();
    return config.security?.shell?.allowedCommands ?? [];
  }

  killAllProcesses(): void {
    for (const [processId, process] of this.activeProcesses) {
      try {
        process.kill();
      } catch (error) {
        log.warn(`Failed to kill process ${processId}: ${(error as Error).message}`);
      }
      this.activeProcesses.delete(processId);
    }
  }

  async executeMultipleCommands(
    commands: string[],
    options: ShellCommandOptions = {}
  ): Promise<ShellResult[]> {
    const results: ShellResult[] = [];

    for (const command of commands) {
      const result = await this.executeCommand(command, options);
      results.push(result);

      if (!result.success && !options.continueOnError) {
        break;
      }
    }

    return results;
  }
}
