export interface Migration {
  id: number;
  statements: string[];
}

export const migrations: Migration[] = [
  {
    id: 1,
    statements: [
      'CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, path TEXT UNIQUE, size INTEGER, lines INTEGER, hash TEXT, lang TEXT, mtime INTEGER, created_at INTEGER)',
      'CREATE TABLE IF NOT EXISTS symbols (id INTEGER PRIMARY KEY, file_id INTEGER, name TEXT, kind TEXT, line INTEGER, col INTEGER, FOREIGN KEY(file_id) REFERENCES files(id))',
      'CREATE TABLE IF NOT EXISTS refs (id INTEGER PRIMARY KEY, file_id INTEGER, symbol_id INTEGER, line INTEGER, col INTEGER, FOREIGN KEY(file_id) REFERENCES files(id), FOREIGN KEY(symbol_id) REFERENCES symbols(id))',
      'CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, priority TEXT, status TEXT, created_at INTEGER, updated_at INTEGER)',
      'CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)',
      'CREATE TABLE IF NOT EXISTS task_tags (task_id INTEGER, tag_id INTEGER, UNIQUE(task_id, tag_id), FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(tag_id) REFERENCES tags(id))',
      'CREATE TABLE IF NOT EXISTS subtasks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, title TEXT, description TEXT, status TEXT, created_at INTEGER, updated_at INTEGER, FOREIGN KEY(task_id) REFERENCES tasks(id))',
      'CREATE TABLE IF NOT EXISTS research (id INTEGER PRIMARY KEY AUTOINCREMENT, prompt TEXT, response TEXT, created_at INTEGER)',
    ],
  },
  {
    id: 2,
    statements: [
      'CREATE TABLE task_dependencies (task_id INTEGER NOT NULL, depends_on_id INTEGER NOT NULL, PRIMARY KEY (task_id, depends_on_id), FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE)',
    ],
  },
];
