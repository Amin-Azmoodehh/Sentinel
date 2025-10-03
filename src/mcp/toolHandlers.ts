import type { McpResponse } from './types.js';
import { McpError, successResponse } from './types.js';
import {
  ensureString,
  ensureNumber,
  ensureBoolean,
  ensureStringArray,
  ensureEncoding,
  parsePriority,
  parseStatus,
} from './validation.js';
import { ShellService, type ShellCommandOptions } from '../services/shellService.js';
import * as taskService from '../services/taskService.js';
import * as fsService from '../services/fsService.js';
import * as indexService from '../services/indexService.js';
import { configService } from '../services/configService.js';
import { runGate } from '../services/gateService.js';

export class ToolHandlers {
  private shellService: ShellService;

  constructor() {
    this.shellService = ShellService.getInstance();
  }

  async handleTaskCreateTool(args: Record<string, unknown>): Promise<McpResponse> {
    const title = ensureString(args.title, 'title');
    const description =
      typeof args.description === 'string'
        ? ensureString(args.description, 'description', true)
        : undefined;
    const priority = parsePriority(args.priority);
    const tags = Array.isArray(args.tags) ? ensureStringArray(args.tags, 'tags') : undefined;
    const task = taskService.createTask({ title, description, priority, tags });
    return successResponse({ task });
  }

  async handleTaskListTool(args: Record<string, unknown>): Promise<McpResponse> {
    const status = args.status !== undefined ? parseStatus(args.status, 'status') : undefined;
    const limit = args.limit !== undefined ? ensureNumber(args.limit, 'limit') : undefined;
    const tagFilter = typeof args.tag === 'string' ? ensureString(args.tag, 'tag') : undefined;
    let tasks = taskService.listTasks(status);
    if (tagFilter) {
      const needle = tagFilter.toLowerCase();
      tasks = tasks.filter((task) => task.tags.some((tag) => tag.toLowerCase() === needle));
    }
    if (typeof limit === 'number' && limit > 0) {
      tasks = tasks.slice(0, limit);
    }
    return successResponse({ tasks });
  }

  async handleTaskNextTool(_args: Record<string, unknown>): Promise<McpResponse> {
    const task = taskService.getNextQueuedTask();
    return successResponse({ task: task ?? null });
  }

  async handleTaskExpandTool(args: Record<string, unknown>): Promise<McpResponse> {
    const id = ensureNumber(args.id, 'id');
    const task = taskService.getTask(id);
    if (!task) {
      throw new McpError('Task not found: ' + id, 'ERR_NOT_FOUND');
    }
    const subtasks = taskService.listSubtasks(id);
    const queue = taskService.getPriorityQueue();
    const queueIndex = queue.findIndex((entry) => entry.id === id);
    return successResponse({ task, subtasks, queueIndex: queueIndex >= 0 ? queueIndex : null });
  }

  async handleFileReadTool(args: Record<string, unknown>): Promise<McpResponse> {
    const targetPath = ensureString(args.path, 'path');
    const encoding =
      args.encoding !== undefined ? ensureEncoding(args.encoding, 'encoding') : 'utf8';
    const maxBytes =
      args.maxBytes !== undefined ? ensureNumber(args.maxBytes, 'maxBytes') : undefined;
    const result = fsService.readFileContent(targetPath, { encoding, maxBytes });
    return successResponse(result);
  }

  async handleFileWriteTool(args: Record<string, unknown>): Promise<McpResponse> {
    const targetPath = ensureString(args.path, 'path');
    const content = ensureString(args.content, 'content', true);
    const encoding =
      args.encoding !== undefined ? ensureEncoding(args.encoding, 'encoding') : 'utf8';
    const mode =
      args.mode !== undefined
        ? (ensureString(args.mode, 'mode') as 'overwrite' | 'append')
        : 'overwrite';
    const result = fsService.writeFileContent(targetPath, content, { encoding, mode });
    return successResponse(result);
  }

  async handleFileDeleteTool(args: Record<string, unknown>): Promise<McpResponse> {
    const targetPath = ensureString(args.path, 'path');
    const force = args.force !== undefined ? ensureBoolean(args.force, 'force') : false;
    await fsService.removePath(targetPath, force);
    return successResponse({ deleted: true, path: targetPath });
  }

  async handleFileMkdirTool(args: Record<string, unknown>): Promise<McpResponse> {
    const paths = ensureStringArray(args.paths, 'paths');
    const result = await fsService.createDirectories(paths);
    return successResponse(result);
  }

  async handleShellExecuteTool(args: Record<string, unknown>): Promise<McpResponse> {
    const command = ensureString(args.command, 'command');

    const sanitizedCommand = this.sanitizeShellCommand(command);

    // Build options more efficiently
    const options = this.buildShellCommandOptions(args);

    const result = await this.shellService.executeCommand(sanitizedCommand, options);
    return successResponse(result);
  }

  private buildShellCommandOptions(args: Record<string, unknown>): ShellCommandOptions {
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

    return options;
  }

  private sanitizeShellCommand(command: string): string {
    const dangerous = /[;&|`$(){}[\]<>"'\\]/g;
    const sanitized = command.replace(dangerous, '');

    const firstWord = sanitized.trim().split(/\s+/)[0];
    const allowedCommands = this.shellService.getAllowedCommands();

    if (!allowedCommands.includes(firstWord)) {
      throw new McpError(
        `Command '${firstWord}' blocked by security policy.\n` +
          `Allowed commands: ${allowedCommands.slice(0, 10).join(', ')}...\n` +
          'Hint: Use mcp0_file_* tools for file operations instead',
        'ERR_FORBIDDEN'
      );
    }

    return sanitized;
  }

  async handleShellDetectTool(_args: Record<string, unknown>): Promise<McpResponse> {
    return successResponse(this.shellService.getDefaultShellInfo());
  }

  async handleShellListTool(_args: Record<string, unknown>): Promise<McpResponse> {
    const commands = this.shellService.getAllowedCommands();
    return successResponse({ commands });
  }

  async handleIndexBuildTool(args: Record<string, unknown>): Promise<McpResponse> {
    const root = args.root !== undefined ? ensureString(args.root, 'root') : undefined;
    if (!root) {
      throw new McpError(
        'Index root required to avoid scanning system files.\n' +
          'Hint: Use root: "project" or root: "src"',
        'ERR_VALIDATION'
      );
    }
    await indexService.indexProject(root);
    return successResponse({ indexed: root });
  }

  async handleIndexQueryTool(args: Record<string, unknown>): Promise<McpResponse> {
    const kind = ensureString(args.kind, 'kind');
    switch (kind) {
      case 'search': {
        const query = ensureString(args.query, 'query');
        const limit = args.limit !== undefined ? ensureNumber(args.limit, 'limit') : undefined;
        const results = indexService.searchIndexedFiles(query, limit);
        return successResponse({ results });
      }
      case 'symbols': {
        const options: indexService.SymbolQueryOptions = {};
        if (args.filePath !== undefined) {
          options.filePath = ensureString(args.filePath, 'filePath');
        }
        if (args.name !== undefined) {
          options.name = ensureString(args.name, 'name');
        }
        if (args.symbolKind !== undefined) {
          options.kind = ensureString(args.symbolKind, 'symbolKind');
        }
        if (args.limit !== undefined) {
          options.limit = ensureNumber(args.limit, 'limit');
        }
        const results = indexService.listIndexedSymbols(options);
        return successResponse({ results });
      }
      case 'document': {
        const filePath = ensureString(args.filePath ?? args.path, 'filePath');
        const maxBytes =
          args.maxBytes !== undefined ? ensureNumber(args.maxBytes, 'maxBytes') : undefined;
        const document = indexService.getFileDocument(filePath, maxBytes);
        if (!document) {
          throw new McpError('Indexed document not found: ' + filePath, 'ERR_NOT_FOUND');
        }
        return successResponse({ document });
      }
      default: {
        throw new McpError('Unsupported index query kind: ' + kind);
      }
    }
  }

  async handleGateRunTool(args: Record<string, unknown>): Promise<McpResponse> {
    const minScore = args.minScore !== undefined ? ensureNumber(args.minScore, 'minScore') : 95;
    const result = await runGate(minScore);
    return successResponse({
      success: result.score >= result.threshold,
      score: result.score,
      threshold: result.threshold,
      details: result,
    });
  }

  async handleGateStatusTool(_args: Record<string, unknown>): Promise<McpResponse> {
    const config = configService.load();
    return successResponse({
      threshold: config.thresholds?.gate ?? 95,
      defaults: config.defaults,
      security: config.security ?? {},
    });
  }
}
