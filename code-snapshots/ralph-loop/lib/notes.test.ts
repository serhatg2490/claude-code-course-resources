import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { closeDb, get, run } from './db';
import {
  DEFAULT_NOTE_TITLE,
  EMPTY_DOC_JSON,
  PUBLIC_SLUG_LENGTH,
  createNote,
  generatePublicSlug,
  toNote,
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
