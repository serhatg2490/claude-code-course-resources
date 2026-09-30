import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { closeDb, get, getDb, query, run } from './db';

type UserRow = {
  id: string;
  name: string;
  email: string;
};

function insertUser(id: string, name: string): void {
  run('INSERT INTO user (id, name, email) VALUES (?, ?, ?)', [id, name, `${id}@example.com`]);
}

beforeEach(() => {
  process.env.DATABASE_PATH = ':memory:';
});

afterEach(() => {
  closeDb();
});

describe('getDb', () => {
  test('returns the same connection on every call', () => {
    expect(getDb()).toBe(getDb());
  });

  test('opens a fresh connection after closeDb()', () => {
    const first = getDb();
    closeDb();

    expect(getDb()).not.toBe(first);
  });

  test('applies the schema on first connection', () => {
    const tables = query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).map((table) => table.name);

    expect(tables).toEqual(['account', 'notes', 'session', 'user', 'verification']);
  });

  test('enforces foreign keys', () => {
    expect(get<{ foreign_keys: number }>('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    expect(() =>
      run(
        "INSERT INTO notes (id, user_id, title, content_json) VALUES ('n1', 'nobody', 't', '{}')",
      ),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });
});

describe('query', () => {
  test('returns all matching rows', () => {
    insertUser('u1', 'Ada');
    insertUser('u2', 'Grace');

    const users = query<UserRow>('SELECT id, name, email FROM user ORDER BY id');

    expect(users).toEqual([
      { id: 'u1', name: 'Ada', email: 'u1@example.com' },
      { id: 'u2', name: 'Grace', email: 'u2@example.com' },
    ]);
  });

  test('binds positional params', () => {
    insertUser('u1', 'Ada');
    insertUser('u2', 'Grace');

    expect(query<UserRow>('SELECT id, name, email FROM user WHERE id = ?', ['u2'])).toEqual([
      { id: 'u2', name: 'Grace', email: 'u2@example.com' },
    ]);
  });

  test('binds named params', () => {
    insertUser('u1', 'Ada');

    expect(
      query<Pick<UserRow, 'id'>>('SELECT id FROM user WHERE name = $name', { name: 'Ada' }),
    ).toEqual([{ id: 'u1' }]);
  });

  test('returns an empty array when nothing matches', () => {
    expect(query<UserRow>('SELECT id, name, email FROM user')).toEqual([]);
  });
});

describe('get', () => {
  test('returns the first matching row', () => {
    insertUser('u1', 'Ada');
    insertUser('u2', 'Grace');

    expect(get<Pick<UserRow, 'name'>>('SELECT name FROM user ORDER BY id DESC')).toEqual({
      name: 'Grace',
    });
  });

  test('returns undefined when nothing matches', () => {
    expect(get<UserRow>('SELECT id, name, email FROM user WHERE id = ?', ['missing'])).toBe(
      undefined,
    );
  });
});

describe('run', () => {
  test('reports the number of inserted, updated and deleted rows', () => {
    insertUser('u1', 'Ada');
    insertUser('u2', 'Grace');

    expect(run("UPDATE user SET name = 'Updated'").changes).toBe(2);
    expect(run('DELETE FROM user WHERE id = ?', ['u1']).changes).toBe(1);
    expect(query<Pick<UserRow, 'id' | 'name'>>('SELECT id, name FROM user')).toEqual([
      { id: 'u2', name: 'Updated' },
    ]);
  });

  test('reports zero changes when nothing matches', () => {
    expect(run('DELETE FROM user WHERE id = ?', ['missing']).changes).toBe(0);
  });
});
