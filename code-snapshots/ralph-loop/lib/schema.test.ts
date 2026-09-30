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
  on_delete: string;
};

type IndexInfo = {
  name: string;
  unique: number;
};

let db: Database;

function columnsOf(table: string): ColumnInfo[] {
  return db.query<ColumnInfo, [string]>('SELECT * FROM pragma_table_info(?)').all(table);
}

function foreignKeysOf(table: string): ForeignKeyInfo[] {
  return db.query<ForeignKeyInfo, [string]>('SELECT * FROM pragma_foreign_key_list(?)').all(table);
}

function indexesOf(table: string): IndexInfo[] {
  return db.query<IndexInfo, [string]>('SELECT * FROM pragma_index_list(?)').all(table);
}

function indexedColumnsOf(index: string): string[] {
  return db
    .query<{ name: string }, [string]>('SELECT name FROM pragma_index_info(?)')
    .all(index)
    .map((column) => column.name);
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

    expect(tables).toEqual(
      expect.arrayContaining(['account', 'notes', 'session', 'user', 'verification']),
    );
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

describe('notes table', () => {
  beforeEach(() => {
    db.run("INSERT INTO user (id, name, email) VALUES ('u1', 'A', 'a@x.io')");
  });

  test('has the expected columns', () => {
    const columns = columnsOf('notes').map(({ name, type, notnull, pk }) => ({
      name,
      type,
      notnull,
      pk,
    }));
    expect(columns).toEqual([
      { name: 'id', type: 'TEXT', notnull: 0, pk: 1 },
      { name: 'user_id', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'title', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'content_json', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'is_public', type: 'INTEGER', notnull: 1, pk: 0 },
      { name: 'public_slug', type: 'TEXT', notnull: 0, pk: 0 },
      { name: 'created_at', type: 'TEXT', notnull: 1, pk: 0 },
      { name: 'updated_at', type: 'TEXT', notnull: 1, pk: 0 },
    ]);
  });

  test('user_id references user(id) and cascades on delete', () => {
    expect(foreignKeysOf('notes')).toEqual([
      expect.objectContaining({ table: 'user', from: 'user_id', to: 'id', on_delete: 'CASCADE' }),
    ]);

    db.run("INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'u1', 'T', '{}')");
    db.run("DELETE FROM user WHERE id = 'u1'");
    const remaining = db.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM notes').get();
    expect(remaining?.count).toBe(0);
  });

  test('rejects notes for unknown users', () => {
    expect(() =>
      db.run(
        "INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'missing', 'T', '{}')",
      ),
    ).toThrow(/FOREIGN KEY/);
  });

  test('public_slug is unique but allows multiple NULLs', () => {
    db.run("INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'u1', 'T', '{}')");
    db.run("INSERT INTO notes (id, user_id, title, content_json) VALUES ('n2', 'u1', 'T', '{}')");
    db.run("UPDATE notes SET public_slug = 'slug' WHERE id = 'n1'");
    expect(() => db.run("UPDATE notes SET public_slug = 'slug' WHERE id = 'n2'")).toThrow(/UNIQUE/);
  });

  test('applies defaults for is_public and timestamps', () => {
    db.run("INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'u1', 'T', '{}')");
    const note = db
      .query<
        { is_public: number; public_slug: string | null; created_at: string; updated_at: string },
        []
      >("SELECT is_public, public_slug, created_at, updated_at FROM notes WHERE id = 'n1'")
      .get();
    expect(note?.is_public).toBe(0);
    expect(note?.public_slug).toBeNull();
    expect(note?.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(note?.updated_at).toBe(note?.created_at);
  });

  test('has indexes on user_id, public_slug and is_public', () => {
    const indexes = new Map(
      indexesOf('notes').map((index) => [index.name, indexedColumnsOf(index.name)]),
    );
    expect(indexes.get('idx_notes_user_id')).toEqual(['user_id']);
    expect(indexes.get('idx_notes_public_slug')).toEqual(['public_slug']);
    expect(indexes.get('idx_notes_is_public')).toEqual(['is_public']);
  });
});
