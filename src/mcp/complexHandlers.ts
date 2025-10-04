import type { McpResponse } from './types.js';
import { McpError, successResponse } from './types.js';
import {
  ensureString,
  ensureNumber,
  ensureStringArray,
  ensureObject,
  parsePriority,
  parseStatus,
  asOptionalNumber,
} from './validation.js';
import {
  ShellService,
  type ShellResult,
  type ShellCommandOptions,
} from '../services/shellService.js';
import * as taskService from '../services/taskService.js';
import * as fsService from '../services/fsService.js';
import * as indexService from '../services/indexService.js';
import * as providerService from '../services/providerService.js';
import { runGateViaCli, type CliGateResult } from '../services/gateService.js';
import * as aiTaskService from '../services/aiTaskService.js';
import { handleContextMonitor } from './toolHandlers/contextMonitorHandler.js';

const TASK_ACTIONS = [
  'createTask',
  'getTask',
  'listTasks',
  'updateTask',
  'deleteTask',
  'createSubtask',
  'listSubtasks',
  'updateSubtask',
  'deleteSubtask',
  'priorityQueue',
  'nextQueuedTask',
  'assignTags',
  'removeTags',
  'listTags',
  'renameTag',
  'copyTag',
  'deleteTag',
  'addDependency',
  'removeDependency',
  'getDependencies',
  'parsePrd',
  'estimateComplexity',
  'suggestNextActions',
] as const;

const FS_ACTIONS = ['list', 'move', 'copy', 'remove', 'split', 'mkdir'] as const;
const SHELL_ACTIONS = [
  'execute',
  'executeMany',
  'executeSync',
  'detectShells',
  'listAllowed',
] as const;
const INDEX_ACTIONS = ['refresh', 'status', 'search', 'symbols', 'document'] as const;
const PROVIDER_ACTIONS = [
  'detect',
  'resolvePreferred',
  'listAllowed',
  'setProvider',
  'setModel',
  'listModels',
] as const;
type GateAction = 'run';

type TaskAction = (typeof TASK_ACTIONS)[number];
type FsAction = (typeof FS_ACTIONS)[number];
type ShellAction = (typeof SHELL_ACTIONS)[number];
type IndexAction = (typeof INDEX_ACTIONS)[number];
type ProviderAction = (typeof PROVIDER_ACTIONS)[number];

export class ComplexHandlers {
  private shellService: ShellService;

  constructor() {
    this.shellService = ShellService.getInstance();
  }

  private sanitizeShellCommand(command: string): string {
    const dangerous = /[;&|`$(){}[\]<>"'\\]/g;
    const sanitized = command.replace(dangerous, '');

    const firstWord = sanitized.trim().split(/\s+/)[0];
    const allowedCommands = this.shellService.getAllowedCommands();

    if (!allowedCommands.includes(firstWord)) {
      throw new McpError(`Command '${firstWord}' is not allowed`, 'ERR_FORBIDDEN');
    }

    return sanitized;
  }

  async handleTaskTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as TaskAction;
    if (!TASK_ACTIONS.includes(action)) {
      throw new McpError('Unsupported task action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'createTask': {
        const title = ensureString(payload.title, 'payload.title');
        const description = payload.description
          ? ensureString(payload.description, 'payload.description', true)
          : undefined;
        const priority = parsePriority(payload.priority);
        const tags = payload.tags ? ensureStringArray(payload.tags, 'payload.tags') : undefined;
        const record = taskService.createTask({ title, description, priority, tags });
        return successResponse(record);
      }
      case 'getTask': {
        const id = ensureNumber(payload.id, 'payload.id');
        const record = taskService.getTask(id);
        if (!record) {
          throw new McpError('Task not found: ' + id, 'ERR_NOT_FOUND');
        }
        return successResponse(record);
      }
      case 'listTasks': {
        const status = parseStatus(payload.status);
        const records = taskService.listTasks(status);
        return successResponse(records);
      }
      case 'updateTask': {
        const id = ensureNumber(payload.id, 'payload.id');
        const updates: taskService.TaskUpdateInput = { id };
        if (payload.title !== undefined) {
          updates.title = ensureString(payload.title, 'payload.title');
        }
        if (payload.description !== undefined) {
          updates.description = ensureString(payload.description, 'payload.description', true);
        }
        if (payload.priority !== undefined) {
          updates.priority = parsePriority(payload.priority);
        }
        if (payload.status !== undefined) {
          updates.status = parseStatus(payload.status, 'payload.status');
        }
        if (payload.addTags !== undefined) {
          updates.addTags = ensureStringArray(payload.addTags, 'payload.addTags');
        }
        if (payload.removeTags !== undefined) {
          updates.removeTags = ensureStringArray(payload.removeTags, 'payload.removeTags');
        }
        const updated = taskService.updateTask(updates);
        if (!updated) {
          throw new McpError('Task not found: ' + id, 'ERR_NOT_FOUND');
        }
        return successResponse(updated);
      }
      case 'deleteTask': {
        const id = ensureNumber(payload.id, 'payload.id');
        const deleted = taskService.deleteTask(id);
        if (!deleted) {
          throw new McpError('Task not found: ' + id, 'ERR_NOT_FOUND');
        }
        return successResponse({ id, deleted: true });
      }
      case 'createSubtask': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const title = ensureString(payload.title, 'payload.title');
        const description = payload.description
          ? ensureString(payload.description, 'payload.description', true)
          : undefined;
        const record = taskService.addSubtask({ taskId, title, description });
        return successResponse(record);
      }
      case 'listSubtasks': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const records = taskService.listSubtasks(taskId);
        return successResponse(records);
      }
      case 'updateSubtask': {
        const id = ensureNumber(payload.id, 'payload.id');
        const updates: taskService.SubtaskUpdateInput = { id };
        if (payload.title !== undefined) {
          updates.title = ensureString(payload.title, 'payload.title');
        }
        if (payload.description !== undefined) {
          updates.description = ensureString(payload.description, 'payload.description', true);
        }
        if (payload.status !== undefined) {
          updates.status = parseStatus(payload.status, 'payload.status');
        }
        const updated = taskService.updateSubtask(updates);
        if (!updated) {
          throw new McpError('Subtask not found: ' + id, 'ERR_NOT_FOUND');
        }
        return successResponse(updated);
      }
      case 'deleteSubtask': {
        const id = ensureNumber(payload.id, 'payload.id');
        const deleted = taskService.deleteSubtask(id);
        if (!deleted) {
          throw new McpError('Subtask not found: ' + id, 'ERR_NOT_FOUND');
        }
        return successResponse({ id, deleted: true });
      }
      case 'priorityQueue': {
        const limit = asOptionalNumber(payload.limit, 'payload.limit');
        const queue = taskService.getPriorityQueue(limit);
        return successResponse(queue);
      }
      case 'nextQueuedTask': {
        const nextTask = taskService.getNextQueuedTask();
        return successResponse(nextTask);
      }
      case 'assignTags': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const tags = ensureStringArray(payload.tags, 'payload.tags');
        const updated = taskService.assignTagsToTask(taskId, tags);
        if (!updated) {
          throw new McpError('Task not found: ' + taskId, 'ERR_NOT_FOUND');
        }
        return successResponse(updated);
      }
      case 'removeTags': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const tags = ensureStringArray(payload.tags, 'payload.tags');
        const updated = taskService.removeTagsFromTask(taskId, tags);
        if (!updated) {
          throw new McpError('Task not found: ' + taskId, 'ERR_NOT_FOUND');
        }
        return successResponse(updated);
      }
      case 'listTags': {
        const tags = taskService.listTags();
        return successResponse(tags);
      }
      case 'renameTag': {
        const from = ensureString(payload.from, 'payload.from');
        const to = ensureString(payload.to, 'payload.to');
        const renamed = taskService.renameTag(from, to);
        if (!renamed) {
          throw new McpError('Source tag not found: ' + from, 'ERR_NOT_FOUND');
        }
        return successResponse({ from, to, renamed: true });
      }
      case 'copyTag': {
        const from = ensureString(payload.from, 'payload.from');
        const to = ensureString(payload.to, 'payload.to');
        const copied = taskService.copyTag(from, to);
        if (!copied) {
          throw new McpError('Source tag not found: ' + from, 'ERR_NOT_FOUND');
        }
        return successResponse({ from, to, copied: true });
      }
      case 'deleteTag': {
        const name = ensureString(payload.name, 'payload.name');
        const deleted = taskService.deleteTag(name);
        if (!deleted) {
          throw new McpError('Tag not found: ' + name, 'ERR_NOT_FOUND');
        }
        return successResponse({ name, deleted: true });
      }
      case 'addDependency': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const dependsOnId = ensureNumber(payload.dependsOnId, 'payload.dependsOnId');
        const success = taskService.addTaskDependency(taskId, dependsOnId);
        if (!success) {
          throw new McpError(
            `Failed to add dependency: ${taskId} -> ${dependsOnId}`,
            'ERR_BAD_REQUEST'
          );
        }
        return successResponse({ taskId, dependsOnId, added: true });
      }
      case 'removeDependency': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const dependsOnId = ensureNumber(payload.dependsOnId, 'payload.dependsOnId');
        taskService.removeTaskDependency(taskId, dependsOnId);
        return successResponse({ taskId, dependsOnId, removed: true });
      }
      case 'getDependencies': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const dependencies = taskService.getTaskDependencies(taskId);
        return successResponse({ taskId, dependencies });
      }
      case 'parsePrd': {
        const content = ensureString(payload.content, 'payload.content');
        const tasks = await aiTaskService.parsePrdToTasks(content);
        return successResponse(tasks);
      }
      case 'estimateComplexity': {
        const taskId = ensureNumber(payload.taskId, 'payload.taskId');
        const task = taskService.getTask(taskId);
        if (!task) {
          throw new McpError('Task not found: ' + taskId, 'ERR_NOT_FOUND');
        }
        const estimation = await aiTaskService.estimateTaskComplexity(task);
        return successResponse(estimation);
      }
      case 'suggestNextActions': {
        const suggestions = await aiTaskService.suggestNextActions();
        return successResponse(suggestions);
      }
      default:
        throw new McpError('Unhandled task action: ' + action);
    }
  }

  async handleFsTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as FsAction;
    if (!FS_ACTIONS.includes(action)) {
      throw new McpError('Unsupported fs action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'list': {
        const pattern = ensureString(payload.pattern ?? '*', 'payload.pattern');
        const result = await fsService.listFiles(pattern);
        return successResponse(result);
      }
      case 'move': {
        const source = ensureString(payload.source, 'payload.source');
        const destination = ensureString(payload.destination, 'payload.destination');
        await fsService.movePath(source, destination);
        return successResponse({ source, destination });
      }
      case 'copy': {
        const source = ensureString(payload.source, 'payload.source');
        const destination = ensureString(payload.destination, 'payload.destination');
        await fsService.copyPath(source, destination);
        return successResponse({ source, destination });
      }
      case 'remove': {
        const target = ensureString(payload.target, 'payload.target');
        const force = payload.force === true;
        await fsService.removePath(target, force);
        return successResponse({ target, removed: true });
      }
      case 'split': {
        const filePath = ensureString(payload.filePath, 'payload.filePath');
        const maxLines = asOptionalNumber(payload.maxLines, 'payload.maxLines');
        const summary = fsService.splitLargeFile(filePath, maxLines);
        return successResponse({ summary });
      }
      case 'mkdir': {
        const paths = ensureStringArray(payload.paths, 'payload.paths');
        const result = await fsService.createDirectories(paths);
        return successResponse(result);
      }
      default:
        throw new McpError('Unhandled fs action: ' + action);
    }
  }

  async handleShellTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as ShellAction;
    if (!SHELL_ACTIONS.includes(action)) {
      throw new McpError('Unsupported shell action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    // Build options object more efficiently
    const options = this.buildShellOptions(payload);

    switch (action) {
      case 'execute': {
        const command = ensureString(payload.command, 'payload.command');
        const sanitizedCommand = this.sanitizeShellCommand(command);
        const result = await this.shellService.executeCommand(sanitizedCommand, options);
        return successResponse(result);
      }
      case 'executeMany': {
        const commands = ensureStringArray(payload.commands, 'payload.commands');
        const sanitizedCommands = commands.map((cmd) => this.sanitizeShellCommand(cmd));
        const results = await this.shellService.executeMultipleCommands(sanitizedCommands, options);
        return successResponse(results);
      }
      case 'executeSync': {
        const command = ensureString(payload.command, 'payload.command');
        const sanitizedCommand = this.sanitizeShellCommand(command);
        const result: ShellResult = this.shellService.executeCommandSync(sanitizedCommand, options);
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

  private buildShellOptions(payload: Record<string, unknown>): ShellCommandOptions {
    const options: ShellCommandOptions = {};

    if (payload.shell !== undefined) {
      options.shell = ensureString(payload.shell, 'payload.shell');
    }
    if (payload.cwd !== undefined) {
      options.cwd = ensureString(payload.cwd, 'payload.cwd');
    }
    const timeout = asOptionalNumber(payload.timeout, 'payload.timeout');
    if (timeout !== undefined) {
      options.timeout = timeout;
    }
    const maxOutputSize = asOptionalNumber(payload.maxOutputSize, 'payload.maxOutputSize');
    if (maxOutputSize !== undefined) {
      options.maxOutputSize = maxOutputSize;
    }
    if (typeof payload.input === 'string') {
      options.input = payload.input;
    }
    if (payload.continueOnError === true) {
      options.continueOnError = true;
    }

    return options;
  }

  async handleIndexTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as IndexAction;
    if (!INDEX_ACTIONS.includes(action)) {
      throw new McpError('Unsupported index action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'refresh': {
        const root = process.cwd();
        await indexService.indexProject(root);
        return successResponse({ indexed: root });
      }
      case 'status': {
        const status = indexService.indexStatus();
        return successResponse(status);
      }
      case 'search': {
        const query = ensureString(payload.query, 'payload.query');
        const limit = asOptionalNumber(payload.limit, 'payload.limit');
        const results = indexService.searchIndexedFiles(query, limit);
        return successResponse(results);
      }
      case 'symbols': {
        const options: indexService.SymbolQueryOptions = {};
        if (payload.filePath !== undefined) {
          options.filePath = ensureString(payload.filePath, 'payload.filePath');
        }
        if (payload.name !== undefined) {
          options.name = ensureString(payload.name, 'payload.name');
        }
        if (payload.kind !== undefined) {
          options.kind = ensureString(payload.kind, 'payload.kind');
        }
        if (payload.limit !== undefined) {
          options.limit = ensureNumber(payload.limit, 'payload.limit');
        }
        const results = indexService.listIndexedSymbols(options);
        return successResponse(results);
      }
      case 'document': {
        const filePath = ensureString(payload.path ?? payload.filePath, 'payload.path');
        const maxBytes = asOptionalNumber(payload.maxBytes, 'payload.maxBytes');
        const result = indexService.getFileDocument(filePath, maxBytes);
        if (!result) {
          throw new McpError('Indexed document not found: ' + filePath, 'ERR_NOT_FOUND');
        }
        return successResponse(result);
      }
      default:
        throw new McpError('Unhandled index action: ' + action);
    }
  }

  async handleProviderTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as ProviderAction;
    if (!PROVIDER_ACTIONS.includes(action)) {
      throw new McpError('Unsupported provider action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'detect': {
        const detection = providerService.detectProviders();
        return successResponse(detection);
      }
      case 'resolvePreferred': {
        const preferred = providerService.resolvePreferredProvider();
        return successResponse(preferred);
      }
      case 'listAllowed': {
        const allowed = providerService.getAllowedProviders();
        return successResponse({ providers: allowed });
      }
      case 'setProvider': {
        const provider = ensureString(payload.provider, 'payload.provider');
        const allowed = providerService.getAllowedProviders();
        if (!allowed.includes(provider)) {
          throw new McpError('Provider not in allowlist: ' + provider, 'ERR_FORBIDDEN');
        }
        providerService.setProvider(provider);
        const resolved = providerService.resolvePreferredProvider();
        return successResponse({ provider, resolved });
      }
      case 'setModel': {
        const model = ensureString(payload.model, 'payload.model');
        providerService.setModel(model);
        return successResponse({ model });
      }
      case 'listModels': {
        const provider = payload.provider
          ? ensureString(payload.provider, 'payload.provider')
          : undefined;
        const result = providerService.listModels(provider);
        return successResponse(result);
      }
      default:
        throw new McpError('Unhandled provider action: ' + action);
    }
  }

  async handleGateTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as GateAction;
    if (action !== 'run') {
      throw new McpError('Unsupported gate action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    const minScore =
      payload.minScore !== undefined ? ensureNumber(payload.minScore, 'payload.minScore') : 95;
    if (minScore < 0 || minScore > 100) {
      throw new McpError('minScore must be between 0 and 100');
    }
    const result: CliGateResult = await runGateViaCli(minScore);
    return successResponse(result);
  }

  async handleContextMonitorTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action');
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};
    
    const result = await handleContextMonitor(action, payload);
    
    if (!result.success) {
      throw new McpError(result.error || 'Context monitor operation failed');
    }
    
    return successResponse(result.data);
  }
}
