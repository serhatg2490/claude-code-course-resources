import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { closeDb, get, run } from './db';
import {
  DEFAULT_NOTE_TITLE,
  EMPTY_DOC_JSON,
  PUBLIC_SLUG_LENGTH,
  createNote,
  deleteNote,
  generatePublicSlug,
  getNoteById,
  getNoteByPublicSlug,
  getNotesByUser,
  setNotePublic,
  toNote,
  updateNote,
  type NoteRow,
} from './notes';

beforeEach(() => {
  process.env.DATABASE_PATH = ':memory:';
});

afterEach(() => {
  closeDb();
});

describe('constants', () => {
  test('default title matches the spec', () => {
    expect(DEFAULT_NOTE_TITLE).toBe('Untitled note');
  });

  test('EMPTY_DOC_JSON is an empty TipTap document', () => {
    expect(JSON.parse(EMPTY_DOC_JSON)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });
});

describe('generatePublicSlug', () => {
  test('returns a URL-safe slug of at least 16 characters', () => {
    const slug = generatePublicSlug();

    expect(PUBLIC_SLUG_LENGTH).toBeGreaterThanOrEqual(16);
    expect(slug).toHaveLength(PUBLIC_SLUG_LENGTH);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(slug)).toBe(slug);
  });

  test('returns a different slug on every call', () => {
    const slugs = new Set(Array.from({ length: 1000 }, generatePublicSlug));

    expect(slugs.size).toBe(1000);
  });
});

describe('toNote', () => {
  const row: NoteRow = {
    id: 'note-1',
    user_id: 'user-1',
    title: 'My note',
    content_json: EMPTY_DOC_JSON,
    is_public: 1,
    public_slug: 'abcdefghijklmnopqrstu',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-02 11:00:00',
  };

  test('maps snake_case columns to camelCase fields', () => {
    expect(toNote(row)).toEqual({
      id: 'note-1',
      userId: 'user-1',
      title: 'My note',
      contentJson: EMPTY_DOC_JSON,
      isPublic: true,
      publicSlug: 'abcdefghijklmnopqrstu',
      createdAt: '2026-01-01 10:00:00',
      updatedAt: '2026-01-02 11:00:00',
    });
  });

  test('maps is_public = 0 to false and keeps a NULL slug', () => {
    const note = toNote({ ...row, is_public: 0, public_slug: null });

    expect(note.isPublic).toBe(false);
    expect(note.publicSlug).toBeNull();
  });

  test('maps a row read from the notes table', () => {
    run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
    run('INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?)', [
      'note-1',
      'user-1',
      DEFAULT_NOTE_TITLE,
      EMPTY_DOC_JSON,
    ]);

    const stored = get<NoteRow>('SELECT * FROM notes WHERE id = ?', ['note-1']);
    expect(stored).toBeDefined();
    if (!stored) return;

    const note = toNote(stored);
    expect(note).toMatchObject({
      id: 'note-1',
      userId: 'user-1',
      title: DEFAULT_NOTE_TITLE,
      contentJson: EMPTY_DOC_JSON,
      isPublic: false,
      publicSlug: null,
    });
    expect(note.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(note.updatedAt).toBe(note.createdAt);
  });
});

describe('createNote', () => {
  beforeEach(() => {
    run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
  });

  test('creates an untitled note with an empty document by default', async () => {
    const note = await createNote('user-1');

    expect(note).toMatchObject({
      userId: 'user-1',
      title: DEFAULT_NOTE_TITLE,
      contentJson: EMPTY_DOC_JSON,
      isPublic: false,
      publicSlug: null,
    });
    expect(note.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(note.updatedAt).toBe(note.createdAt);
  });

  test('uses the provided title and content', async () => {
    const contentJson = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    });

    const note = await createNote('user-1', { title: 'Groceries', contentJson });

    expect(note.title).toBe('Groceries');
    expect(note.contentJson).toBe(contentJson);
  });

  test('persists the note under the owning user', async () => {
    const note = await createNote('user-1', { title: 'Stored' });

    const stored = get<NoteRow>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [
      note.id,
      'user-1',
    ]);
    expect(stored).toBeDefined();
    if (!stored) return;
    expect(toNote(stored)).toEqual(note);
  });

  test('generates a unique UUID for every note', async () => {
    const first = await createNote('user-1');
    const second = await createNote('user-1');

    expect(first.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(second.id).not.toBe(first.id);
  });

  test('rejects a user that does not exist', async () => {
    await expect(createNote('ghost')).rejects.toThrow(/FOREIGN KEY/);
  });
});

describe('reading notes', () => {
  beforeEach(() => {
    run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
    run("INSERT INTO user (id, name, email) VALUES ('user-2', 'Grace', 'grace@example.com')");
  });

  /** Seeds a note with explicit timestamps, since `datetime('now')` only has 1-second resolution. */
  function seedNote(id: string, userId: string, createdAt: string, updatedAt: string): void {
    run(
      'INSERT INTO notes (id, user_id, title, content_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, `Note ${id}`, EMPTY_DOC_JSON, createdAt, updatedAt],
    );
  }

  describe('getNoteById', () => {
    test("returns the owner's note", async () => {
      const created = await createNote('user-1', { title: 'Mine' });

      expect(await getNoteById('user-1', created.id)).toEqual(created);
    });

    test('returns null for a note owned by another user', async () => {
      const created = await createNote('user-1', { title: 'Private' });

      expect(await getNoteById('user-2', created.id)).toBeNull();
    });

    test('returns null for a note that does not exist', async () => {
      expect(await getNoteById('user-1', 'missing')).toBeNull();
    });
  });

  describe('getNotesByUser', () => {
    test('returns an empty list for a user without notes', async () => {
      expect(await getNotesByUser('user-1')).toEqual([]);
    });

    test("returns only the user's own notes", async () => {
      seedNote('a', 'user-1', '2026-01-01 10:00:00', '2026-01-01 10:00:00');
      seedNote('b', 'user-2', '2026-01-01 10:00:00', '2026-01-01 10:00:00');
      seedNote('c', 'user-1', '2026-01-01 10:00:00', '2026-01-01 10:00:00');

      const notes = await getNotesByUser('user-1');

      expect(notes.map((note) => note.id).sort()).toEqual(['a', 'c']);
      expect(notes.every((note) => note.userId === 'user-1')).toBe(true);
    });

    test('orders notes by updated_at, most recent first', async () => {
      seedNote('old', 'user-1', '2026-01-01 10:00:00', '2026-01-01 10:00:00');
      seedNote('edited', 'user-1', '2026-01-01 09:00:00', '2026-03-01 12:00:00');
      seedNote('new', 'user-1', '2026-02-01 10:00:00', '2026-02-01 10:00:00');

      const notes = await getNotesByUser('user-1');

      expect(notes.map((note) => note.id)).toEqual(['edited', 'new', 'old']);
    });

    test('breaks updated_at ties by created_at, most recent first', async () => {
      seedNote('first', 'user-1', '2026-01-01 10:00:00', '2026-05-01 10:00:00');
      seedNote('second', 'user-1', '2026-01-02 10:00:00', '2026-05-01 10:00:00');

      const notes = await getNotesByUser('user-1');

      expect(notes.map((note) => note.id)).toEqual(['second', 'first']);
    });

    test('maps rows to camelCase Notes', async () => {
      const created = await createNote('user-1', { title: 'Mapped' });

      expect(await getNotesByUser('user-1')).toEqual([created]);
    });
  });
});

describe('updateNote', () => {
  const SEEDED_AT = '2026-01-01 10:00:00';
  const NEW_CONTENT = JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }],
  });

  beforeEach(() => {
    run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
    run("INSERT INTO user (id, name, email) VALUES ('user-2', 'Grace', 'grace@example.com')");
    // Old explicit timestamps, so the `updated_at` bump is observable without sleeping.
    run(
      'INSERT INTO notes (id, user_id, title, content_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['note-1', 'user-1', 'Original', EMPTY_DOC_JSON, SEEDED_AT, SEEDED_AT],
    );
  });

  test('updates the title only', async () => {
    const note = await updateNote('user-1', 'note-1', { title: 'Renamed' });

    expect(note).toMatchObject({ title: 'Renamed', contentJson: EMPTY_DOC_JSON });
  });

  test('updates the content only', async () => {
    const note = await updateNote('user-1', 'note-1', { contentJson: NEW_CONTENT });

    expect(note).toMatchObject({ title: 'Original', contentJson: NEW_CONTENT });
  });

  test('updates title and content together and persists them', async () => {
    const note = await updateNote('user-1', 'note-1', { title: 'Both', contentJson: NEW_CONTENT });

    expect(note).toMatchObject({ title: 'Both', contentJson: NEW_CONTENT });
    expect(await getNoteById('user-1', 'note-1')).toEqual(note);
  });

  test('keeps an empty-string title rather than treating it as missing', async () => {
    const note = await updateNote('user-1', 'note-1', { title: '' });

    expect(note?.title).toBe('');
  });

  test('bumps updated_at and leaves created_at alone', async () => {
    const note = await updateNote('user-1', 'note-1', { title: 'Renamed' });

    expect(note?.createdAt).toBe(SEEDED_AT);
    expect(note?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(note && note.updatedAt > SEEDED_AT).toBe(true);
  });

  test('returns the note unchanged when there is nothing to update', async () => {
    const note = await updateNote('user-1', 'note-1', {});

    expect(note).toMatchObject({ title: 'Original', updatedAt: SEEDED_AT });
  });

  test("returns null and leaves another user's note untouched", async () => {
    expect(await updateNote('user-2', 'note-1', { title: 'Hijacked' })).toBeNull();

    expect(await getNoteById('user-1', 'note-1')).toMatchObject({
      title: 'Original',
      updatedAt: SEEDED_AT,
    });
  });

  test('returns null for a note that does not exist', async () => {
    expect(await updateNote('user-1', 'missing', { title: 'Nope' })).toBeNull();
  });

  test('does not change public sharing state', async () => {
    run(
      "UPDATE notes SET is_public = 1, public_slug = 'abcdefghijklmnopqrstu' WHERE id = 'note-1'",
    );

    const note = await updateNote('user-1', 'note-1', { title: 'Still shared' });

    expect(note).toMatchObject({ isPublic: true, publicSlug: 'abcdefghijklmnopqrstu' });
  });
});

describe('deleteNote', () => {
  beforeEach(() => {
    run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
    run("INSERT INTO user (id, name, email) VALUES ('user-2', 'Grace', 'grace@example.com')");
  });

  test("deletes the owner's note and returns true", async () => {
    const note = await createNote('user-1');

    expect(await deleteNote('user-1', note.id)).toBe(true);
    expect(await getNoteById('user-1', note.id)).toBeNull();
  });

  test("returns false and keeps another user's note", async () => {
    const note = await createNote('user-1', { title: 'Keep me' });

    expect(await deleteNote('user-2', note.id)).toBe(false);
    expect(await getNoteById('user-1', note.id)).toEqual(note);
  });

  test('returns false for a note that does not exist', async () => {
    expect(await deleteNote('user-1', 'missing')).toBe(false);
  });

  test('returns false when deleting the same note twice', async () => {
    const note = await createNote('user-1');

    expect(await deleteNote('user-1', note.id)).toBe(true);
    expect(await deleteNote('user-1', note.id)).toBe(false);
  });

  test("only deletes the targeted note, leaving the user's other notes", async () => {
    const doomed = await createNote('user-1', { title: 'Doomed' });
    const kept = await createNote('user-1', { title: 'Kept' });

    await deleteNote('user-1', doomed.id);

    expect(await getNotesByUser('user-1')).toEqual([kept]);
  });

  test('frees the public slug of a deleted shared note', async () => {
    const note = await createNote('user-1');
    run("UPDATE notes SET is_public = 1, public_slug = 'abcdefghijklmnopqrstu' WHERE id = ?", [
      note.id,
    ]);

    await deleteNote('user-1', note.id);

    expect(
      get<NoteRow>("SELECT * FROM notes WHERE public_slug = 'abcdefghijklmnopqrstu'"),
    ).toBeUndefined();
  });
});

describe('sharing', () => {
  const SEEDED_AT = '2026-01-01 10:00:00';
  const SLUG_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${PUBLIC_SLUG_LENGTH}}$`);

  beforeEach(() => {
    run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
    run("INSERT INTO user (id, name, email) VALUES ('user-2', 'Grace', 'grace@example.com')");
    // Old explicit timestamps, so the `updated_at` bump is observable without sleeping.
    run(
      'INSERT INTO notes (id, user_id, title, content_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['note-1', 'user-1', 'Shareable', EMPTY_DOC_JSON, SEEDED_AT, SEEDED_AT],
    );
  });

  describe('setNotePublic', () => {
    test('enabling makes the note public with a fresh slug', async () => {
      const note = await setNotePublic('user-1', 'note-1', true);

      expect(note?.isPublic).toBe(true);
      expect(note?.publicSlug).toMatch(SLUG_PATTERN);
      expect(await getNoteById('user-1', 'note-1')).toEqual(note);
    });

    test('enabling an already public note keeps its slug', async () => {
      const first = await setNotePublic('user-1', 'note-1', true);
      const second = await setNotePublic('user-1', 'note-1', true);

      expect(second?.publicSlug).toBe(first?.publicSlug ?? 'missing');
    });

    test('disabling makes the note private and clears the slug', async () => {
      await setNotePublic('user-1', 'note-1', true);

      const note = await setNotePublic('user-1', 'note-1', false);

      expect(note).toMatchObject({ isPublic: false, publicSlug: null });
    });

    test('re-enabling after disabling generates a new slug', async () => {
      const first = await setNotePublic('user-1', 'note-1', true);
      await setNotePublic('user-1', 'note-1', false);
      const second = await setNotePublic('user-1', 'note-1', true);

      expect(second?.publicSlug).toMatch(SLUG_PATTERN);
      expect(second?.publicSlug).not.toBe(first?.publicSlug ?? null);
    });

    test('gives different notes different slugs', async () => {
      const other = await createNote('user-1');

      const first = await setNotePublic('user-1', 'note-1', true);
      const second = await setNotePublic('user-1', other.id, true);

      expect(second?.publicSlug).not.toBe(first?.publicSlug ?? null);
    });

    test('bumps updated_at and leaves title and content alone', async () => {
      const note = await setNotePublic('user-1', 'note-1', true);

      expect(note).toMatchObject({
        title: 'Shareable',
        contentJson: EMPTY_DOC_JSON,
        createdAt: SEEDED_AT,
      });
      expect(note && note.updatedAt > SEEDED_AT).toBe(true);
    });

    test("returns null and leaves another user's note private", async () => {
      expect(await setNotePublic('user-2', 'note-1', true)).toBeNull();

      expect(await getNoteById('user-1', 'note-1')).toMatchObject({
        isPublic: false,
        publicSlug: null,
        updatedAt: SEEDED_AT,
      });
    });

    test("cannot unshare another user's note", async () => {
      const shared = await setNotePublic('user-1', 'note-1', true);

      expect(await setNotePublic('user-2', 'note-1', false)).toBeNull();
      expect(await getNoteById('user-1', 'note-1')).toEqual(shared);
    });

    test('returns null for a note that does not exist', async () => {
      expect(await setNotePublic('user-1', 'missing', true)).toBeNull();
    });
  });

  describe('getNoteByPublicSlug', () => {
    test('returns a shared note by its slug', async () => {
      const shared = await setNotePublic('user-1', 'note-1', true);
      expect(shared?.publicSlug).toMatch(SLUG_PATTERN);
      if (!shared?.publicSlug) return;

      expect(await getNoteByPublicSlug(shared.publicSlug)).toEqual(shared);
    });

    test('returns null for an unknown slug', async () => {
      expect(await getNoteByPublicSlug('doesnotexist123456789')).toBeNull();
    });

    test('returns null once sharing is disabled', async () => {
      const shared = await setNotePublic('user-1', 'note-1', true);
      await setNotePublic('user-1', 'note-1', false);
      expect(shared?.publicSlug).toMatch(SLUG_PATTERN);
      if (!shared?.publicSlug) return;

      expect(await getNoteByPublicSlug(shared.publicSlug)).toBeNull();
    });

    test('returns null when a slug exists but is_public = 0', async () => {
      run(
        "UPDATE notes SET is_public = 0, public_slug = 'abcdefghijklmnopqrstu' WHERE id = 'note-1'",
      );

      expect(await getNoteByPublicSlug('abcdefghijklmnopqrstu')).toBeNull();
    });
  });
});
