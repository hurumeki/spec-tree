import type { Database } from 'better-sqlite3';

export interface Migration {
  version: number;
  apply: (db: Database) => void;
}

// Baseline schema (v1) is applied directly from schema.sql in init.ts.
// Additional migrations for future schema bumps go here, ordered by version.
export const MIGRATIONS: readonly Migration[] = [];
