import { Command } from 'commander';
import chalk from 'chalk';
import {
  addSubtask,
  createTask,
  deleteTask,
  getTask,
  listSubtasks,
  listTasks,
  updateTask,
} from '../services/taskService.js';
import { renderTable } from '../utils/table.js';
import { log } from '../utils/logger.js';

const parseTags = (input?: string): string[] => {
  if (!input) {
    return [];
  }
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseTagChanges = (input?: string): { add: string[]; remove: string[] } => {
  if (!input) {
    return { add: [], remove: [] };
  }
  const segments = input
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const add: string[] = [];
  const remove: string[] = [];
  segments.forEach((segment) => {
    if (segment.startsWith('+')) {
      add.push(segment.slice(1));
    } else if (segment.startsWith('-')) {
      remove.push(segment.slice(1));
    }
  });
  return { add, remove };
};

interface TaskUpdateOptions {
  title?: string;
  desc?: string;
  priority?: 'high' | 'med' | 'low';
  status?: 'open' | 'in-progress' | 'review' | 'done' | 'blocked';
  tags?: string;
}

export const registerTaskCommands = (program: Command): void => {
  const taskCommand = program.command('task').description('📋 Manage tasks and workflows');

  taskCommand
    .command('create')
    .alias('add')
    .description('Create a new task')
    .requiredOption('--title <title>', 'Task title')
    .option('--desc <description>', 'Task description', '')
    .option('--priority <priority>', 'Task priority', 'med')
    .option('--tags <tags>', 'Comma separated tags')
    .action((options: { title: string; desc?: string; priority: string; tags?: string }) => {
      const record = createTask({
        title: options.title,
        description: options.desc || '',
        priority: options.priority as 'high' | 'med' | 'low',
        tags: parseTags(options.tags),
      });
      log.success('Task created with id ' + String(record.id));
    });

  taskCommand
    .command('show <id>')
    .description('Show task details')
    .action((id: string) => {
      const record = getTask(Number(id));
      if (!record) {
        log.warn('Task not found: ' + id);
        return;
      }
      const rows = [
        ['ID', String(record.id)],
        ['Title', record.title],
        ['Priority', record.priority],
        ['Status', record.status],
        ['Tags', record.tags.join(', ')],
      ];
      log.raw(renderTable({ head: ['Field', 'Value'], rows }));
    });

  taskCommand
    .command('list')
    .description('List tasks')
    .option('--status <status>', 'Filter by status (open, in-progress, review, done, blocked)')
    .action((options: { status?: 'open' | 'in-progress' | 'review' | 'done' | 'blocked' }) => {
      const records = listTasks(options.status);
      const rows = records.map((task) => [
        String(task.id),
        task.title,
        task.priority,
        task.status,
        task.tags.join(', '),
      ]);
      const table = renderTable({ head: ['ID', 'Title', 'Priority', 'Status', 'Tags'], rows });
      log.raw(table);
    });

  taskCommand
    .command('update <id>')
    .description('Update task fields')
    .option('--title <title>', 'New title')
    .option('--desc <description>', 'New description')
    .option('--priority <priority>', 'New priority')
    .option('--status <status>', 'New status (open, in-progress, review, done, blocked)')
    .option('--tags <ops>', 'Tag updates, e.g. +feat,-bug')
    .action((id: string, options: TaskUpdateOptions) => {
      const tagChanges = parseTagChanges(options.tags);
      
      // Debug logging
      if (options.status) {
        log.info(`Updating task ${id} status to: "${options.status}"`);
      }
      
      const record = updateTask({
        id: Number(id),
        title: options.title,
        description: options.desc,
        priority: options.priority,
        status: options.status,
        addTags: tagChanges.add,
        removeTags: tagChanges.remove,
      });
      if (!record) {
        log.warn('Task not found: ' + id);
        return;
      }
      
      // Show updated status
      if (options.status && record.status) {
        log.info(`Task status updated to: "${record.status}"`);
      }
      
      log.success('Task updated.');
    });

  taskCommand
    .command('complete <id>')
    .alias('done')
    .description('Mark task as done')
    .action((id: string) => {
      const record = updateTask({
        id: Number(id),
        status: 'done',
      });
      if (!record) {
        log.warn('Task not found: ' + id);
        return;
      }
      log.success(`Task ${id} marked as done.`);
    });

  taskCommand
    .command('delete <id>')
    .description('Delete a task')
    .option('--force', 'Skip confirmation prompt')
    .action((id: string, options: { force?: boolean }) => {
      const taskId = Number(id);
      const task = getTask(taskId);
      
      if (!task) {
        log.warn('Task not found: ' + id);
        return;
      }

      if (!options.force) {
        log.warn(`Are you sure you want to delete task "${task.title}"? Use --force to confirm.`);
        return;
      }

      const success = deleteTask(taskId);
      if (success) {
        log.success(`Task "${task.title}" deleted successfully.`);
      } else {
        log.error('Failed to delete task.');
      }
    });

  const subCommand = program.command('sub').description('📝 Manage subtasks');

  subCommand
    .command('add')
    .description('Add subtask to parent task')
    .requiredOption('--parent <id>', 'Parent task id')
    .requiredOption('--title <title>', 'Subtask title')
    .requiredOption('--description <description>', 'Subtask description')
    .action((options: { parent: string; title: string; description: string }) => {
      const record = addSubtask({
        taskId: Number(options.parent),
        title: options.title,
        description: options.description,
      });
      log.success('Subtask created with id ' + String(record.id));
    });

  subCommand
    .command('list')
    .description('List subtasks for a task')
    .requiredOption('--parent <id>', 'Parent task id')
    .action((options: { parent: string }) => {
      const subtasks = listSubtasks(Number(options.parent));
      if (subtasks.length === 0) {
        log.warn('No subtasks found.');
        return;
      }
      const rows = subtasks.map((record) => [
        String(record.id),
        record.title,
        record.status,
        chalk.gray(new Date(record.createdAt).toISOString()),
      ]);
      const table = renderTable({ head: ['ID', 'Title', 'Status', 'Created'], rows });
      log.raw(table);
    });
};
