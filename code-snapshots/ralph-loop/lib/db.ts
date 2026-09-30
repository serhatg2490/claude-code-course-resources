import { Database, type Changes, type SQLQueryBindings } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from './schema';

const DEFAULT_DATABASE_PATH = 'data/app.db';

/**
 * Positional (`?`) bindings as an array, or named (`$name`, `:name`, `@name`) bindings as an object.
 * Named keys are written without the prefix because connections use `strict: true`.
 */
export type SqlParams = SQLQueryBindings[] | Record<string, Exclude<SQLQueryBindings, object>>;

declare global {
  // Survives Next.js dev-server module reloads, so we don't leak a connection per reload.
  var __notesDb: Database | undefined;
}

/**
 * Opens a connection, applies connection-level pragmas and runs migrations.
 * Pass `:memory:` for an isolated database (tests).
 */
export function openDb(path: string): Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new Database(path, { create: true, strict: true });
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

/**
 * Returns the shared connection, opening it on first use.
 * Reads `DATABASE_PATH` (default `data/app.db`) lazily so tests can override it.
 */
export function getDb(): Database {
  globalThis.__notesDb ??= openDb(process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH);
  return globalThis.__notesDb;
}

/**
 * Closes the shared connection. The next `getDb()` call opens a fresh one.
 */
export function closeDb(): void {
  globalThis.__notesDb?.close();
  globalThis.__notesDb = undefined;
}

function toBindings(params: SqlParams): SQLQueryBindings[] {
  return Array.isArray(params) ? params : [params];
}

/**
 * Runs a SELECT and returns every row.
 */
export function query<T>(sql: string, params: SqlParams = []): T[] {
  return getDb()
    .query<T, SQLQueryBindings[]>(sql)
    .all(...toBindings(params));
}

/**
 * Runs a SELECT and returns the first row, or `undefined` when there is none.
 */
export function get<T>(sql: string, params: SqlParams = []): T | undefined {
  return (
    getDb()
      .query<T, SQLQueryBindings[]>(sql)
      .get(...toBindings(params)) ?? undefined
  );
}

/**
 * Runs an INSERT, UPDATE or DELETE and reports how many rows changed.
 */
export function run(sql: string, params: SqlParams = []): Changes {
  return getDb()
    .query<unknown, SQLQueryBindings[]>(sql)
    .run(...toBindings(params));
}
