import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { SCHEMA } from '@/lib/db-schema';

const DB_PATH = process.env.DB_PATH ?? 'data/app.db';

function createDb(): Database {
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH, { create: true });
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);

  return db;
}

// Cached on globalThis so Next's dev-time module reloads reuse one connection.
const globalForDb = globalThis as typeof globalThis & { __appDb?: Database };

/** Returns the singleton DB connection, creating & migrating it on first call. */
export function getDb(): Database {
  return (globalForDb.__appDb ??= createDb());
}

export const db = getDb();

export function query<T>(sql: string, params: unknown[] = []): T[] {
  return getDb()
    .query(sql)
    .all(...(params as never[])) as T[];
}

export function get<T>(sql: string, params: unknown[] = []): T | undefined {
  return (
    (getDb()
      .query(sql)
      .get(...(params as never[])) as T | null) ?? undefined
  );
}

export function run(sql: string, params: unknown[] = []) {
  return getDb()
    .query(sql)
    .run(...(params as never[]));
}
