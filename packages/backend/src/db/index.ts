import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database, { type Database as DatabaseInstance } from 'better-sqlite3';
import { DEFAULT_DB_PATH } from './paths.js';
import { applyPragmas, initializeSchema } from './init.js';

export { CURRENT_SCHEMA_VERSION } from './init.js';
export { DEFAULT_DB_PATH, REPO_ROOT } from './paths.js';
export type { Database } from 'better-sqlite3';

export function openDatabase(dbPath: string = DEFAULT_DB_PATH): DatabaseInstance {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  applyPragmas(db);
  initializeSchema(db);
  return db;
}

export function openInMemoryDatabase(): DatabaseInstance {
  return openDatabase(':memory:');
}
