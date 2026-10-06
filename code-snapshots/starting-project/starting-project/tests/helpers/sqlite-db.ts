import { DatabaseSync } from 'node:sqlite';

import { SCHEMA } from '@/lib/db-schema';

type Params = unknown[];

/**
 * In-memory stand-in for `@/lib/db`: `bun:sqlite` isn't available under Vitest (Node),
 * so the same schema runs on `node:sqlite` and exposes the same query/get/run helpers.
 */
export function createTestDb() {
  let db = open();

  function open(): DatabaseSync {
    const instance = new DatabaseSync(':memory:');
    instance.exec('PRAGMA foreign_keys = ON;');
    instance.exec(SCHEMA);
    return instance;
  }

  function statement(sql: string) {
    return db.prepare(sql);
  }

  return {
    query<T>(sql: string, params: Params = []): T[] {
      return statement(sql).all(...(params as never[])) as T[];
    },
    get<T>(sql: string, params: Params = []): T | undefined {
      return statement(sql).get(...(params as never[])) as T | undefined;
    },
    run(sql: string, params: Params = []) {
      return statement(sql).run(...(params as never[]));
    },
    /** Fresh, empty database; call in `beforeEach`. */
    reset() {
      db.close();
      db = open();
    },
    insertUser(id: string) {
      db.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)').run(
        id,
        id,
        `${id}@example.com`,
      );
    },
  };
}
