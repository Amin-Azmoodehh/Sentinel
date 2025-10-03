import type { ExperimentalTool } from './types.js';

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
const INDEX_ACTIONS = [
  'refresh',
  'status',
  'search',
  'symbols',
  'document',
  'advanced',
  'searchAdvanced',
] as const;
const SECURITY_ACTIONS = [
  'validatePath',
  'addWhitelist',
  'addBlacklist',
  'getWhitelist',
  'getBlacklist',
] as const;
const DASHBOARD_ACTIONS = ['getMetrics', 'generateReport'] as const;
const CICD_ACTIONS = ['generateWorkflow', 'runPipeline', 'runQualityGate', 'getHistory'] as const;
const PROVIDER_ACTIONS = [
  'detect',
  'resolvePreferred',
  'listAllowed',
  'setProvider',
  'setModel',
  'listModels',
] as const;
const GATE_ACTIONS = ['run'] as const;

export const buildTaskToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_task',
  description: `Manage SentinelTM tasks, subtasks, tags, and priority queue operations. Available actions: ${TASK_ACTIONS.join(', ')}. Use updateTask (not task_update) to modify tasks.`,
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...TASK_ACTIONS] },
      payload: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Task ID' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          status: { type: 'string', enum: ['open', 'in-progress', 'review', 'done', 'blocked'] },
          priority: { type: 'string', enum: ['high', 'med', 'low'] },
          tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' },
          parent: { type: 'number', description: 'Parent task ID for subtasks' },
          dependsOn: { type: 'number', description: 'Task dependency ID' },
        },
      },
    },
    required: ['action'],
  },
});

export const buildFsToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_fs',
  description: 'Perform secure file and directory operations within the workspace',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...FS_ACTIONS] },
      payload: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Target path' },
          paths: { type: 'array', items: { type: 'string' }, description: 'Array of paths for mkdir' },
          source: { type: 'string', description: 'Source path for copy/move' },
          destination: { type: 'string', description: 'Destination path for copy/move' },
          pattern: { type: 'string', description: 'Glob pattern for list' },
          maxLines: { type: 'number', description: 'Max lines per chunk for split' },
          force: { type: 'boolean', description: 'Force operation' },
        },
      },
    },
    required: ['action'],
  },
});

export const buildShellToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_shell',
  description: 'Execute shell commands with strict allowlists and sandboxing',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...SHELL_ACTIONS] },
      payload: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          commands: { type: 'array', items: { type: 'string' }, description: 'Multiple commands' },
          args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
          cwd: { type: 'string', description: 'Working directory' },
          timeoutMs: { type: 'number', description: 'Timeout in milliseconds' },
          shell: { type: 'string', description: 'Shell to use (cmd, pwsh, bash)' },
        },
      },
    },
    required: ['action'],
  },
});

export const buildIndexToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_index',
  description:
    'Project indexing with advanced filters, external project support, and symbol search',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...INDEX_ACTIONS] },
      payload: { type: 'object' },
    },
    required: ['action'],
  },
});

export const buildProviderToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_provider',
  description: 'Detect and configure available model providers',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...PROVIDER_ACTIONS] },
      payload: {
        type: 'object',
        properties: {
          provider: { type: 'string', description: 'Provider name (qwen, gemini, ollama, codex)' },
          model: { type: 'string', description: 'Model name' },
        },
      },
    },
    required: ['action'],
  },
});

export const buildGateToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_gate',
  description: 'Run SentinelTM quality gates with enforced thresholds',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...GATE_ACTIONS] },
      payload: {
        type: 'object',
        properties: {
          minScore: { type: 'number', description: 'Minimum quality score threshold' },
          timeoutMs: { type: 'number', description: 'Timeout in milliseconds' },
        },
      },
    },
    required: ['action'],
  },
});

export const buildTaskCreateToolDefinition = (): ExperimentalTool => ({
  name: 'task_create',
  description: 'Create a new task with optional description, priority, and tags',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['high', 'med', 'low'] },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['title'],
  },
});

export const buildTaskListToolDefinition = (): ExperimentalTool => ({
  name: 'task_list',
  description: 'List tasks, optionally filtered by status or tag',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['open', 'in-progress', 'review', 'done', 'blocked'] },
      tag: { type: 'string' },
      limit: { type: 'number' },
    },
  },
});

export const buildTaskNextToolDefinition = (): ExperimentalTool => ({
  name: 'task_next',
  description: 'Fetch the next task in the priority queue',
  inputSchema: { type: 'object', properties: {} },
});

export const buildTaskExpandToolDefinition = (): ExperimentalTool => ({
  name: 'task_expand',
  description: 'Fetch task details, subtasks, and queue position',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'number' } },
    required: ['id'],
  },
});

export const buildFileReadToolDefinition = (): ExperimentalTool => ({
  name: 'file_read',
  description: 'Read a file within the workspace',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      encoding: { type: 'string' },
      maxBytes: { type: 'number' },
    },
    required: ['path'],
  },
});

export const buildFileWriteToolDefinition = (): ExperimentalTool => ({
  name: 'file_write',
  description: 'Write or append content to a file in the workspace',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
      encoding: { type: 'string' },
      mode: { type: 'string', enum: ['overwrite', 'append'] },
    },
    required: ['path', 'content'],
  },
});

export const buildFileDeleteToolDefinition = (): ExperimentalTool => ({
  name: 'file_delete',
  description: 'Delete a file or directory inside the workspace',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      force: { type: 'boolean' },
    },
    required: ['path'],
  },
});

export const buildFileMkdirToolDefinition = (): ExperimentalTool => ({
  name: 'file_mkdir',
  description: 'Create one or more directories inside the workspace',
  inputSchema: {
    type: 'object',
    properties: {
      paths: { type: 'array', items: { type: 'string' } },
    },
    required: ['paths'],
  },
});

export const buildShellExecuteToolDefinition = (): ExperimentalTool => ({
  name: 'shell_execute',
  description: 'Execute a guarded shell command',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      cwd: { type: 'string' },
      shell: { type: 'string' },
      timeout: { type: 'number' },
      maxOutputSize: { type: 'number' },
      continueOnError: { type: 'boolean' },
      input: { type: 'string' },
    },
    required: ['command'],
  },
});

export const buildShellDetectToolDefinition = (): ExperimentalTool => ({
  name: 'shell_detect',
  description: 'Detect available shells on the host system',
  inputSchema: { type: 'object', properties: {} },
});

export const buildShellListToolDefinition = (): ExperimentalTool => ({
  name: 'shell_list',
  description: 'List the allowed shell commands',
  inputSchema: { type: 'object', properties: {} },
});

export const buildIndexBuildToolDefinition = (): ExperimentalTool => ({
  name: 'index_build',
  description:
    'Build or refresh the SQLite project index. REQUIRED: Specify root to avoid scanning system files (e.g., root: "project" or "src")',
  inputSchema: {
    type: 'object',
    properties: {
      root: {
        type: 'string',
        description: 'Project subdirectory to index (REQUIRED to prevent EBUSY errors)',
      },
    },
    required: ['root'],
  },
});

export const buildIndexQueryToolDefinition = (): ExperimentalTool => ({
  name: 'index_query',
  description: 'Query the project index for search results, symbols, or documents',
  inputSchema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['search', 'symbols', 'document'] },
      query: { type: 'string' },
      limit: { type: 'number' },
      filePath: { type: 'string' },
      name: { type: 'string' },
      symbolKind: { type: 'string' },
      maxBytes: { type: 'number' },
    },
    required: ['kind'],
  },
});

export const buildGateRunToolDefinition = (): ExperimentalTool => ({
  name: 'gate_run',
  description: 'Run the SentinelTM gate until the minimum score is met',
  inputSchema: {
    type: 'object',
    properties: { minScore: { type: 'number' } },
  },
});

export const buildGateStatusToolDefinition = (): ExperimentalTool => ({
  name: 'gate_status',
  description: 'Inspect gate thresholds, security rules, and defaults',
  inputSchema: { type: 'object', properties: {} },
});

export const buildSecurityToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_security',
  description: 'Path security validation and whitelist/blacklist management',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...SECURITY_ACTIONS] },
      payload: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File or directory path' },
          paths: { type: 'array', items: { type: 'string' }, description: 'Array of paths' },
          reason: { type: 'string', description: 'Reason for blacklisting' },
        },
      },
    },
    required: ['action'],
  },
});

export const buildDashboardToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_dashboard',
  description: 'Project monitoring and analytics dashboard',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...DASHBOARD_ACTIONS] },
      payload: { type: 'object' },
    },
    required: ['action'],
  },
});

export const buildCICDToolDefinition = (): ExperimentalTool => ({
  name: 'sentinel_cicd',
  description: 'CI/CD pipeline integration and management',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: [...CICD_ACTIONS] },
      payload: { type: 'object' },
    },
    required: ['action'],
  },
});
