import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// Both src/db/paths.ts and dist/db/paths.js sit four levels below the repo root.
const repoRoot = resolve(here, '..', '..', '..', '..');

export const REPO_ROOT = repoRoot;
export const DEFAULT_DB_PATH = resolve(repoRoot, 'data', 'trace.db');
