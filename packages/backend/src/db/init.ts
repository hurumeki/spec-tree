import { readFileSync } from 'node:fs';
import type { Database } from 'better-sqlite3';
import { MIGRATIONS } from './migrations.js';

export const CURRENT_SCHEMA_VERSION = 3;

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export function applyPragmas(db: Database): void {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
}

function readUserVersion(db: Database): number {
  const rows = db.pragma('user_version') as Array<{ user_version: number }>;
  return rows[0]?.user_version ?? 0;
}

function setUserVersion(db: Database, version: number): void {
  db.pragma(`user_version = ${version}`);
}

export function initializeSchema(db: Database): void {
  const existing = readUserVersion(db);

  if (existing > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${existing} is newer than this build (${CURRENT_SCHEMA_VERSION}). ` +
        'Upgrade the application or restore a compatible snapshot.',
    );
  }

  db.exec('BEGIN');
  try {
    if (existing === 0) {
      db.exec(schemaSql);
      setUserVersion(db, 1);
    }

    let current = readUserVersion(db);
    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue;
      if (migration.version !== current + 1) {
        throw new Error(
          `Non-contiguous migration: expected v${current + 1}, found v${migration.version}.`,
        );
      }
      migration.apply(db);
      setUserVersion(db, migration.version);
      current = migration.version;
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
