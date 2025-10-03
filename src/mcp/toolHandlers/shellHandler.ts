import {
  ShellService,
  type ShellResult,
  type ShellCommandOptions,
} from '../../services/shellService.js';
import {
  ensureString,
  ensureStringArray,
  ensureNumber,
  ensureBoolean,
  ensureObject,
} from '../validation.js';
import { McpResponse, McpError } from '../types.js';
import { successResponse } from '../utils.js';

const SHELL_ACTIONS = [
  'execute',
  'executeMany',
  'executeSync',
  'detectShells',
  'listAllowed',
] as const;
type ShellAction = (typeof SHELL_ACTIONS)[number];

export class ShellHandler {
  private shellService: ShellService;

  constructor() {
    this.shellService = ShellService.getInstance();
  }

  async handleShellTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as ShellAction;
    if (!SHELL_ACTIONS.includes(action)) {
      throw new McpError('Unsupported shell action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    const options: ShellCommandOptions = {};
    if (payload.shell !== undefined) {
      options.shell = ensureString(payload.shell, 'payload.shell');
    }
    if (payload.cwd !== undefined) {
      options.cwd = ensureString(payload.cwd, 'payload.cwd');
    }
    const timeout = this.asOptionalNumber(payload.timeout, 'payload.timeout');
    if (timeout !== undefined) {
      options.timeout = timeout;
    }
    const maxOutputSize = this.asOptionalNumber(payload.maxOutputSize, 'payload.maxOutputSize');
    if (maxOutputSize !== undefined) {
      options.maxOutputSize = maxOutputSize;
    }
    if (typeof payload.input === 'string') {
      options.input = payload.input;
    }
    if (payload.continueOnError === true) {
      options.continueOnError = true;
    }

    switch (action) {
      case 'execute': {
        const command = ensureString(payload.command, 'payload.command');
        const result = await this.shellService.executeCommand(command, options);
        return successResponse(result);
      }
      case 'executeMany': {
        const commands = ensureStringArray(payload.commands, 'payload.commands');
        const results = await this.shellService.executeMultipleCommands(commands, options);
        return successResponse(results);
      }
      case 'executeSync': {
        const command = ensureString(payload.command, 'payload.command');
        const result: ShellResult = this.shellService.executeCommandSync(command, options);
        return successResponse(result);
      }
      case 'detectShells': {
        const result = this.shellService.getDefaultShellInfo();
        return successResponse(result);
      }
      case 'listAllowed': {
        const commands = this.shellService.getAllowedCommands();
        return successResponse({ commands });
      }
      default:
        throw new McpError('Unhandled shell action: ' + action);
    }
  }

  private async handleShellExecuteTool(args: Record<string, unknown>): Promise<McpResponse> {
    const command = ensureString(args.command, 'command');
    const options: ShellCommandOptions = {};
    if (args.shell !== undefined) {
      options.shell = ensureString(args.shell, 'shell');
    }
    if (args.cwd !== undefined) {
      options.cwd = ensureString(args.cwd, 'cwd');
    }
    if (args.timeout !== undefined) {
      options.timeout = ensureNumber(args.timeout, 'timeout');
    }
    if (args.maxOutputSize !== undefined) {
      options.maxOutputSize = ensureNumber(args.maxOutputSize, 'maxOutputSize');
    }
    if (args.continueOnError !== undefined) {
      options.continueOnError = ensureBoolean(args.continueOnError, 'continueOnError');
    }
    if (typeof args.input === 'string') {
      options.input = args.input;
    }
    const result = await this.shellService.executeCommand(command, options);
    return successResponse(result);
  }

  private async handleShellDetectTool(_args: Record<string, unknown>): Promise<McpResponse> {
    return successResponse(this.shellService.getDefaultShellInfo());
  }

  private async handleShellListTool(_args: Record<string, unknown>): Promise<McpResponse> {
    const commands = this.shellService.getAllowedCommands();
    return successResponse({ commands });
  }

  private asOptionalNumber(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return ensureNumber(value, field);
  }
}
