import fs from 'node:fs';
import initSqlJs, { type BindParams, Database } from 'sql.js';
import { paths } from '../constants/paths.js';
import { migrations } from '../db/migrations.js';

const SQL = await initSqlJs();

let dbInstance: Database | null = null;
let inTransaction = false;

const dbPath = paths.indexDb();

const saveDatabase = (): void => {
  if (!dbInstance || inTransaction) {
    return;
  }
  const data = dbInstance.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
};

const loadDatabase = (): Database => {
  if (dbInstance) {
    return dbInstance;
  }
  paths.ensureDir(paths.dbDir());
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    dbInstance = new SQL.Database();
  }
  ensureMigrations(dbInstance);
  saveDatabase();
  return dbInstance as Database;
};

const ensureMigrations = (db: Database): void => {
  db.run(
    'CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)'
  );
  const appliedStmt = db.prepare('SELECT id FROM migrations');
  const applied = new Set<number>();
  while (appliedStmt.step()) {
    const row = appliedStmt.getAsObject() as { id: number };
    applied.add(row.id);
  }
  appliedStmt.free();
  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    db.run('BEGIN TRANSACTION');
    try {
      migration.statements.forEach((statement) => {
        db.run(statement);
      });
      const insert = db.prepare('INSERT INTO migrations (id, applied_at) VALUES (?, ?)');
      insert.bind([migration.id, Date.now()]);
      insert.step();
      insert.free();
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  }
};

const execute = (sql: string, params: BindParams = []): void => {
  const db = loadDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDatabase();
};

const queryAll = (sql: string, params: BindParams = []): Record<string, unknown>[] => {
  const db = loadDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

const queryGet = (sql: string, params: BindParams = []): Record<string, unknown> | null => {
  const db = loadDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result: Record<string, unknown> | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
};

export const sqliteService = {
  run: (sql: string, params: BindParams = []): void => {
    execute(sql, params);
  },
  get: (sql: string, params: BindParams = []): Record<string, unknown> | null =>
    queryGet(sql, params),
  all: (sql: string, params: BindParams = []): Record<string, unknown>[] => queryAll(sql, params),
  transaction: <T>(callback: () => T): T => {
    const db = loadDatabase();
    db.run('BEGIN TRANSACTION');
    inTransaction = true;
    try {
      const result = callback();
      db.run('COMMIT');
      return result;
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    } finally {
      inTransaction = false;
      saveDatabase();
    }
  },
};
