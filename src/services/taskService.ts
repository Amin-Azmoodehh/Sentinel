import { sqliteService } from './sqliteService.js';

export type TaskPriority = 'high' | 'med' | 'low';
export type TaskStatus = 'open' | 'in-progress' | 'review' | 'done' | 'blocked';

export interface TaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
}

export interface TaskUpdateInput {
  id: number;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  addTags?: string[];
  removeTags?: string[];
}

export interface SubtaskInput {
  taskId: number;
  title: string;
  description?: string;
}

export interface SubtaskUpdateInput {
  id: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface TaskRecord {
  id: number;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  dependencies: number[];
}

export interface SubtaskRecord {
  id: number;
  taskId: number;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface TagRecord {
  id: number;
  name: string;
  usageCount: number;
}

const VALID_PRIORITIES: TaskPriority[] = ['high', 'med', 'low'];
const DEFAULT_PRIORITY: TaskPriority = 'med';
const VALID_STATUSES: TaskStatus[] = ['open', 'in-progress', 'review', 'done', 'blocked'];
const DEFAULT_STATUS: TaskStatus = 'open';

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  med: 1,
  low: 2,
};

const sanitizePriority = (value?: string): TaskPriority => {
  if (!value) {
    return DEFAULT_PRIORITY;
  }
  const normalized = value.trim().toLowerCase();
  return (VALID_PRIORITIES.find((priority) => priority === normalized) ??
    DEFAULT_PRIORITY) as TaskPriority;
};

const sanitizeStatus = (value?: string): TaskStatus => {
  const normalized = value?.trim().toLowerCase();
  return (VALID_STATUSES.find((s) => s === normalized) ?? DEFAULT_STATUS) as TaskStatus;
};

const sanitizeTitle = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error('Task title is required');
  }
  return trimmed;
};

const sanitizeDescription = (value?: string): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeTags = (tags?: string[]): string[] => {
  if (!Array.isArray(tags)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  tags.forEach((tag) => {
    const trimmed = String(tag || '').trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      normalized.push(trimmed);
    }
  });
  return normalized;
};

const insertTag = (name: string): number => {
  const trimmed = name.trim();
  if (!trimmed) {
    return 0;
  }
  sqliteService.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [trimmed]);
  const row = sqliteService.get('SELECT id FROM tags WHERE name = ?', [trimmed]);
  return row ? Number(row.id) : 0;
};

const setTaskTags = (taskId: number, tags: string[]): void => {
  normalizeTags(tags).forEach((name) => {
    const tagId = insertTag(name);
    if (tagId > 0) {
      sqliteService.run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [
        taskId,
        tagId,
      ]);
    }
  });
};

const removeTaskTags = (taskId: number, tags: string[]): void => {
  normalizeTags(tags).forEach((name) => {
    sqliteService.run(
      'DELETE FROM task_tags WHERE task_id = ? AND tag_id = (SELECT id FROM tags WHERE name = ?)',
      [taskId, name.trim()]
    );
  });
};

const mapTaskRow = (row: Record<string, unknown>): TaskRecord => {
  const dependencies = sqliteService
    .all('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?', [Number(row.id)])
    .map((r) => Number(r.depends_on_id));

  return {
    id: Number(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    priority: sanitizePriority(String(row.priority || 'med')),
    status: sanitizeStatus(String(row.status || 'open')),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
    tags: row.tags ? String(row.tags).split(',').filter(Boolean) : [],
    dependencies,
  };
};

const fetchTask = (id: number): TaskRecord | null => {
  const row = sqliteService.get(
    'SELECT t.*, GROUP_CONCAT(tags.name, ",") as tags FROM tasks t ' +
      'LEFT JOIN task_tags ON task_tags.task_id = t.id ' +
      'LEFT JOIN tags ON tags.id = task_tags.tag_id WHERE t.id = ? GROUP BY t.id',
    [id]
  );
  return row ? mapTaskRow(row) : null;
};

export const createTask = (input: TaskInput): TaskRecord => {
  const now = Date.now();
  const priority = sanitizePriority(input.priority);
  const title = sanitizeTitle(input.title);
  const description = sanitizeDescription(input.description);
  const tags = normalizeTags(input.tags);
  return sqliteService.transaction(() => {
    sqliteService.run(
      'INSERT INTO tasks (title, description, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, priority, 'open', now, now]
    );
    const idRow = sqliteService.get('SELECT last_insert_rowid() as id');
    const taskId = idRow ? Number(idRow.id) : 0;
    setTaskTags(taskId, tags);
    const record = fetchTask(taskId);
    if (!record) {
      throw new Error('Failed to create task record');
    }
    return record;
  });
};

export const getTask = (id: number): TaskRecord | null => fetchTask(id);

export const listTasks = (status?: TaskStatus): TaskRecord[] => {
  const rows = sqliteService.all(
    'SELECT t.*, GROUP_CONCAT(tags.name, ",") as tags FROM tasks t ' +
      'LEFT JOIN task_tags ON task_tags.task_id = t.id ' +
      'LEFT JOIN tags ON tags.id = task_tags.tag_id ' +
      (status ? 'WHERE t.status = ? ' : '') +
      'GROUP BY t.id ORDER BY t.created_at DESC',
    status ? [status] : []
  );
  return rows.map(mapTaskRow);
};

export const updateTask = (input: TaskUpdateInput): TaskRecord | null => {
  return sqliteService.transaction(() => {
    const existing = sqliteService.get('SELECT id FROM tasks WHERE id = ?', [input.id]);
    if (!existing) {
      return null;
    }
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    if (typeof input.title === 'string') {
      updates.push('title = ?');
      values.push(sanitizeTitle(input.title));
    }
    if (typeof input.description === 'string') {
      updates.push('description = ?');
      values.push(sanitizeDescription(input.description));
    }
    if (typeof input.priority === 'string') {
      updates.push('priority = ?');
      values.push(sanitizePriority(input.priority));
    }
    if (typeof input.status === 'string') {
      updates.push('status = ?');
      values.push(sanitizeStatus(input.status));
    }
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(input.id);
      sqliteService.run('UPDATE tasks SET ' + updates.join(', ') + ' WHERE id = ?', values);
    }
    if (input.addTags && input.addTags.length > 0) {
      setTaskTags(input.id, input.addTags);
    }
    if (input.removeTags && input.removeTags.length > 0) {
      removeTaskTags(input.id, input.removeTags);
    }
    return fetchTask(input.id);
  });
};

export const addSubtask = (input: SubtaskInput): SubtaskRecord => {
  const now = Date.now();
  const title = sanitizeTitle(input.title);
  const description = sanitizeDescription(input.description);
  return sqliteService.transaction(() => {
    sqliteService.run(
      'INSERT INTO subtasks (task_id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [input.taskId, title, description, 'open', now, now]
    );
    const idRow = sqliteService.get('SELECT last_insert_rowid() as id');
    const subId = idRow ? Number(idRow.id) : 0;
    const row = sqliteService.get('SELECT * FROM subtasks WHERE id = ?', [subId]);
    if (!row) {
      throw new Error('Failed to create subtask');
    }
    return {
      id: Number(row.id),
      taskId: Number(row.task_id),
      title: String(row.title || ''),
      description: String(row.description || ''),
      status: sanitizeStatus(String(row.status || 'open')),
      createdAt: Number(row.created_at || 0),
      updatedAt: Number(row.updated_at || 0),
    };
  });
};

export const listSubtasks = (taskId: number): SubtaskRecord[] => {
  const rows = sqliteService.all(
    'SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC',
    [taskId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    taskId: Number(row.task_id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    status: sanitizeStatus(String(row.status || 'open')),
    createdAt: Number(row.created_at || 0),
    updatedAt: Number(row.updated_at || 0),
  }));
};

export const updateSubtask = (input: SubtaskUpdateInput): SubtaskRecord | null => {
  return sqliteService.transaction(() => {
    const existing = sqliteService.get('SELECT * FROM subtasks WHERE id = ?', [input.id]);
    if (!existing) {
      return null;
    }
    const updates: string[] = [];
    const values: (string | number)[] = [];
    if (typeof input.title === 'string') {
      updates.push('title = ?');
      values.push(sanitizeTitle(input.title));
    }
    if (typeof input.description === 'string') {
      updates.push('description = ?');
      values.push(sanitizeDescription(input.description));
    }
    if (typeof input.status === 'string') {
      updates.push('status = ?');
      values.push(sanitizeStatus(input.status));
    }
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(input.id);
      sqliteService.run('UPDATE subtasks SET ' + updates.join(', ') + ' WHERE id = ?', values);
    }
    const row = sqliteService.get('SELECT * FROM subtasks WHERE id = ?', [input.id]);
    if (!row) {
      return null;
    }
    return {
      id: Number(row.id),
      taskId: Number(row.task_id),
      title: String(row.title || ''),
      description: String(row.description || ''),
      status: sanitizeStatus(String(row.status || 'open')),
      createdAt: Number(row.created_at || 0),
      updatedAt: Number(row.updated_at || 0),
    };
  });
};

export const deleteSubtask = (id: number): boolean => {
  return sqliteService.transaction(() => {
    const existing = sqliteService.get('SELECT id FROM subtasks WHERE id = ?', [id]);
    if (!existing) {
      return false;
    }
    sqliteService.run('DELETE FROM subtasks WHERE id = ?', [id]);
    return true;
  });
};

export const deleteTask = (id: number): boolean => {
  return sqliteService.transaction(() => {
    const existing = sqliteService.get('SELECT id FROM tasks WHERE id = ?', [id]);
    if (!existing) {
      return false;
    }
    sqliteService.run('DELETE FROM task_tags WHERE task_id = ?', [id]);
    sqliteService.run('DELETE FROM subtasks WHERE task_id = ?', [id]);
    sqliteService.run('DELETE FROM task_dependencies WHERE task_id = ? OR depends_on_id = ?', [
      id,
      id,
    ]);
    sqliteService.run('DELETE FROM tasks WHERE id = ?', [id]);
    return true;
  });
};

export interface PriorityQueueEntry extends TaskRecord {
  priorityRank: number;
}

const queueQueryBase =
  'SELECT t.*, GROUP_CONCAT(tags.name, ",") as tags, CASE t.priority WHEN "high" THEN 0 WHEN "med" THEN 1 ELSE 2 END as priorityRank ' +
  'FROM tasks t ' +
  'LEFT JOIN task_tags ON task_tags.task_id = t.id ' +
  'LEFT JOIN tags ON tags.id = task_tags.tag_id ' +
  'WHERE t.status = "open" ' +
  'GROUP BY t.id ' +
  'ORDER BY priorityRank ASC, t.updated_at ASC';

export const getPriorityQueue = (limit?: number): PriorityQueueEntry[] => {
  const rows = sqliteService.all(queueQueryBase + (limit ? ' LIMIT ?' : ''), limit ? [limit] : []);
  return rows.map((row) => ({
    ...mapTaskRow(row),
    priorityRank: Number(row.priorityRank ?? PRIORITY_RANK[DEFAULT_PRIORITY]),
  }));
};

export const getNextQueuedTask = (): PriorityQueueEntry | null => {
  const queue = getPriorityQueue();
  for (const task of queue) {
    const deps = getTaskDependencies(task.id);
    const allDepsMet = deps.every((depId) => {
      const depTask = getTask(depId);
      return depTask?.status === 'done';
    });
    if (allDepsMet) {
      return task;
    }
  }
  return null;
};

export const addTaskDependency = (taskId: number, dependsOnId: number): boolean => {
  if (taskId === dependsOnId) return false; // Cannot depend on itself
  return sqliteService.transaction(() => {
    const taskExists = sqliteService.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    const dependsOnExists = sqliteService.get('SELECT id FROM tasks WHERE id = ?', [dependsOnId]);
    if (!taskExists || !dependsOnExists) return false;

    // Check for circular dependencies (simple check)
    const existingDeps = getTaskDependencies(dependsOnId);
    if (existingDeps.includes(taskId)) return false;

    sqliteService.run(
      'INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)',
      [taskId, dependsOnId]
    );
    return true;
  });
};

export const removeTaskDependency = (taskId: number, dependsOnId: number): boolean => {
  sqliteService.run('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?', [
    taskId,
    dependsOnId,
  ]);
  return true;
};

export const getTaskDependencies = (taskId: number): number[] => {
  const rows = sqliteService.all('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?', [
    taskId,
  ]);
  return rows.map((r) => Number(r.depends_on_id));
};

export const assignTagsToTask = (taskId: number, tags: string[]): TaskRecord | null => {
  return sqliteService.transaction(() => {
    const existing = sqliteService.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!existing) {
      return null;
    }
    setTaskTags(taskId, tags);
    return fetchTask(taskId);
  });
};

export const removeTagsFromTask = (taskId: number, tags: string[]): TaskRecord | null => {
  return sqliteService.transaction(() => {
    const existing = sqliteService.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!existing) {
      return null;
    }
    removeTaskTags(taskId, tags);
    return fetchTask(taskId);
  });
};

export interface TaskSummary {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  lastUpdated: number | null;
  nextTask: PriorityQueueEntry | null;
}

export const getTaskSummary = (): TaskSummary => {
  const totalRow = sqliteService.get('SELECT COUNT(*) as total FROM tasks');
  const total = totalRow ? Number(totalRow.total || 0) : 0;

  const statusRows = sqliteService.all(
    'SELECT status, COUNT(*) as total FROM tasks GROUP BY status'
  );
  const byStatus: Record<TaskStatus, number> = {
    open: 0,
    'in-progress': 0,
    review: 0,
    done: 0,
    blocked: 0,
  };
  statusRows.forEach((row) => {
    const status = String(row.status || '').toLowerCase() as TaskStatus;
    if ((VALID_STATUSES as ReadonlyArray<string>).includes(status)) {
      byStatus[status] = Number(row.total || 0);
    }
  });

  const priorityRows = sqliteService.all(
    'SELECT priority, COUNT(*) as total FROM tasks GROUP BY priority'
  );
  const byPriority: Record<TaskPriority, number> = {
    high: 0,
    med: 0,
    low: 0,
  };
  priorityRows.forEach((row) => {
    const priority = String(row.priority || '').toLowerCase() as TaskPriority;
    if ((VALID_PRIORITIES as ReadonlyArray<string>).includes(priority)) {
      byPriority[priority] = Number(row.total || 0);
    }
  });

  const lastUpdatedRow = sqliteService.get('SELECT MAX(updated_at) as ts FROM tasks');
  const lastUpdated =
    lastUpdatedRow && lastUpdatedRow.ts !== null && lastUpdatedRow.ts !== undefined
      ? Number(lastUpdatedRow.ts)
      : null;

  const nextTask = getNextQueuedTask();

  return {
    total,
    byStatus,
    byPriority,
    lastUpdated,
    nextTask,
  };
};
export const listTags = (): TagRecord[] => {
  const rows = sqliteService.all(
    'SELECT tags.id, tags.name, COUNT(task_tags.task_id) as usageCount FROM tags ' +
      'LEFT JOIN task_tags ON task_tags.tag_id = tags.id ' +
      'GROUP BY tags.id ORDER BY LOWER(tags.name) ASC'
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    usageCount: Number(row.usageCount || 0),
  }));
};

export const renameTag = (from: string, to: string): boolean => {
  const source = String(from || '').trim();
  const target = String(to || '').trim();
  if (!source || !target) {
    throw new Error('Tag names must be non-empty');
  }
  return sqliteService.transaction(() => {
    const sourceRow = sqliteService.get('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)', [
      source,
    ]);
    if (!sourceRow) {
      return false;
    }
    const targetRow = sqliteService.get('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)', [
      target,
    ]);
    const sourceId = Number(sourceRow.id);
    if (targetRow) {
      const targetId = Number(targetRow.id);
      sqliteService.run(
        'INSERT OR IGNORE INTO task_tags (task_id, tag_id) ' +
          'SELECT task_id, ? FROM task_tags WHERE tag_id = ?',
        [targetId, sourceId]
      );
      sqliteService.run('DELETE FROM task_tags WHERE tag_id = ?', [sourceId]);
      sqliteService.run('DELETE FROM tags WHERE id = ?', [sourceId]);
      return true;
    }
    sqliteService.run('UPDATE tags SET name = ? WHERE id = ?', [target, sourceId]);
    return true;
  });
};

export const copyTag = (from: string, to: string): boolean => {
  const source = String(from || '').trim();
  const target = String(to || '').trim();
  if (!source || !target) {
    throw new Error('Tag names must be non-empty');
  }
  return sqliteService.transaction(() => {
    const sourceRow = sqliteService.get('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)', [
      source,
    ]);
    if (!sourceRow) {
      return false;
    }
    const targetId = insertTag(target);
    if (targetId === 0) {
      return false;
    }
    sqliteService.run(
      'INSERT OR IGNORE INTO task_tags (task_id, tag_id) ' +
        'SELECT task_id, ? FROM task_tags WHERE tag_id = ?',
      [targetId, Number(sourceRow.id)]
    );
    return true;
  });
};

export const deleteTag = (name: string): boolean => {
  const tagName = String(name || '').trim();
  if (!tagName) {
    throw new Error('Tag name must be non-empty');
  }
  return sqliteService.transaction(() => {
    const row = sqliteService.get('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)', [tagName]);
    if (!row) {
      return false;
    }
    const tagId = Number(row.id);
    sqliteService.run('DELETE FROM task_tags WHERE tag_id = ?', [tagId]);
    sqliteService.run('DELETE FROM tags WHERE id = ?', [tagId]);
    return true;
  });
};
