import { Database } from 'bun:sqlite';
import { beforeEach, describe, expect, test } from 'bun:test';
import { migrate } from './schema';

type ColumnInfo = {
  name: string;
  type: string;
  notnull: number;
  pk: number;
};

type ForeignKeyInfo = {
  table: string;
  from: string;
  to: string;
};

let db: Database;

function columnsOf(table: string): ColumnInfo[] {
  return db.query<ColumnInfo, [string]>('SELECT * FROM pragma_table_info(?)').all(table);
}

function foreignKeysOf(table: string): ForeignKeyInfo[] {
  return db.query<ForeignKeyInfo, [string]>('SELECT * FROM pragma_foreign_key_list(?)').all(table);
}

beforeEach(() => {
  db = new Database(':memory:', { strict: true });
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
});

describe('migrate', () => {
  test('creates all better-auth tables', () => {
    const tables = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all()
      .map((table) => table.name);

    expect(tables).toEqual(expect.arrayContaining(['account', 'session', 'user', 'verification']));
  });

  test('is idempotent', () => {
    expect(() => migrate(db)).not.toThrow();
  });

  test('user table has the expected columns', () => {
    const columns = columnsOf('user').map((column) => column.name);
    expect(columns).toEqual([
      'id',
      'name',
      'email',
      'emailVerified',
      'image',
      'createdAt',
      'updatedAt',
    ]);
  });

  test('session table has userId foreign key and unique token', () => {
    const columns = columnsOf('session').map((column) => column.name);
    expect(columns).toEqual([
      'id',
      'userId',
      'token',
      'expiresAt',
      'ipAddress',
      'userAgent',
      'createdAt',
      'updatedAt',
    ]);
    expect(foreignKeysOf('session')).toEqual([
      expect.objectContaining({ table: 'user', from: 'userId', to: 'id' }),
    ]);

    db.run("INSERT INTO user (id, name, email) VALUES ('u1', 'A', 'a@x.io')");
    db.run(
      "INSERT INTO session (id, userId, token, expiresAt) VALUES ('s1', 'u1', 't', '2030-01-01')",
    );
    expect(() =>
      db.run(
        "INSERT INTO session (id, userId, token, expiresAt) VALUES ('s2', 'u1', 't', '2030-01-01')",
      ),
    ).toThrow(/UNIQUE/);
  });

  test('account table supports the credential provider', () => {
    const columns = columnsOf('account').map((column) => column.name);
    expect(columns).toEqual(
      expect.arrayContaining(['userId', 'accountId', 'providerId', 'password']),
    );
    expect(foreignKeysOf('account')).toEqual([
      expect.objectContaining({ table: 'user', from: 'userId', to: 'id' }),
    ]);
  });

  test('verification table has the expected columns', () => {
    const columns = columnsOf('verification').map((column) => column.name);
    expect(columns).toEqual(['id', 'identifier', 'value', 'expiresAt', 'createdAt', 'updatedAt']);
  });

  test('rejects sessions for unknown users', () => {
    expect(() =>
      db.run(
        "INSERT INTO session (id, userId, token, expiresAt) VALUES ('s1', 'missing', 't', '2030-01-01')",
      ),
    ).toThrow(/FOREIGN KEY/);
  });

  test('user email is unique and defaults are applied', () => {
    db.run("INSERT INTO user (id, name, email) VALUES ('u1', 'A', 'a@x.io')");
    expect(() => db.run("INSERT INTO user (id, name, email) VALUES ('u2', 'B', 'a@x.io')")).toThrow(
      /UNIQUE/,
    );

    const user = db
      .query<{ emailVerified: number; createdAt: string }, []>(
        "SELECT emailVerified, createdAt FROM user WHERE id = 'u1'",
      )
      .get();
    expect(user?.emailVerified).toBe(0);
    expect(user?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
