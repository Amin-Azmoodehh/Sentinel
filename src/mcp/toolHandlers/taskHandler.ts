import * as taskService from '../../services/taskService.js';
import {
  ensureNumber,
  ensureString,
  ensureStringArray,
  ensureObject,
  parsePriority,
  parseStatus,
} from '../validation.js';
import { McpResponse, McpError } from '../types.js';
import { successResponse } from '../utils.js';

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
] as const;

type TaskAction = (typeof TASK_ACTIONS)[number];

export class TaskHandler {
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
        const record = taskService.createTask({
          title,
          description,
          priority,
          tags,
        });
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
        const updates: taskService.TaskUpdateInput = {
          id,
        };
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
        const taskId =
          payload.taskId !== undefined
            ? ensureNumber(payload.taskId, 'payload.taskId')
            : ensureNumber(payload.parent, 'payload.parent');
        const title = ensureString(payload.title, 'payload.title');
        const description = payload.description
          ? ensureString(payload.description, 'payload.description', true)
          : undefined;
        const record = taskService.addSubtask({ taskId, title, description });
        return successResponse(record);
      }
      case 'listSubtasks': {
        const taskId =
          payload.taskId !== undefined
            ? ensureNumber(payload.taskId, 'payload.taskId')
            : ensureNumber(payload.parent, 'payload.parent');
        const records = taskService.listSubtasks(taskId);
        return successResponse(records);
      }
      case 'updateSubtask': {
        const id = ensureNumber(payload.id, 'payload.id');
        const updates: taskService.SubtaskUpdateInput = {
          id,
        };
        if (payload.title !== undefined) {
          updates.title = ensureString(payload.title, 'payload.title');
        }
        if (payload.description !== undefined) {
          updates.description = ensureString(payload.description, 'payload.description', true);
        }
        if (payload.status !== undefined) {
          updates.status = parseStatus(payload.status, 'payload.status');
        }
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new McpError('Subtask update timeout (15s)')), 15000)
        );
        const updated = await Promise.race([
          Promise.resolve(taskService.updateSubtask(updates)),
          timeoutPromise,
        ]);
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
        const limit = this.asOptionalNumber(payload.limit, 'payload.limit');
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
      default:
        throw new McpError('Unhandled task action: ' + action);
    }
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

  private asOptionalNumber(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return ensureNumber(value, field);
  }
}
