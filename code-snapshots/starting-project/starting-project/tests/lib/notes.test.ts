import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_NOTE_TITLE, EMPTY_DOC_JSON } from '@/lib/note-schemas';
import {
  createNote,
  deleteNote,
  getNoteById,
  getNoteByPublicSlug,
  getNotesByUser,
  updateNote,
} from '@/lib/notes';

const testDb = await vi.hoisted(async () => {
  const { createTestDb } = await import('../helpers/sqlite-db');
  return createTestDb();
});

vi.mock('@/lib/db', () => ({ query: testDb.query, get: testDb.get, run: testDb.run }));

const DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

beforeEach(() => {
  testDb.reset();
  testDb.insertUser('alice');
  testDb.insertUser('bob');
});

describe('createNote', () => {
  it('applies defaults for a new note', async () => {
    const note = await createNote('alice');
    expect(note).toMatchObject({
      userId: 'alice',
      title: DEFAULT_NOTE_TITLE,
      contentJson: EMPTY_DOC_JSON,
      isPublic: false,
      publicSlug: null,
    });
    expect(note.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('falls back to the default title when the title is empty', async () => {
    expect((await createNote('alice', { title: '' })).title).toBe(DEFAULT_NOTE_TITLE);
  });

  it('generates a public slug for shared notes', async () => {
    const note = await createNote('alice', { title: 'Shared', contentJson: DOC, isPublic: true });
    expect(note.isPublic).toBe(true);
    expect(note.publicSlug).toEqual(expect.any(String));
  });
});

describe('getNotesByUser', () => {
  it("returns only the user's notes, most recently updated first", async () => {
    const older = await createNote('alice', { title: 'Older' });
    const newer = await createNote('alice', { title: 'Newer' });
    await createNote('bob', { title: "Bob's" });
    testDb.run(`UPDATE notes SET updated_at = '2020-01-01 00:00:00' WHERE id = ?`, [older.id]);

    const notes = await getNotesByUser('alice');
    expect(notes.map((note) => note.id)).toEqual([newer.id, older.id]);
  });
});

describe('getNoteById', () => {
  it('returns the note for its owner only', async () => {
    const note = await createNote('alice', { title: 'Private' });
    expect(await getNoteById('alice', note.id)).toEqual(note);
    expect(await getNoteById('bob', note.id)).toBeNull();
  });
});

describe('updateNote', () => {
  it('updates fields and bumps updated_at', async () => {
    const note = await createNote('alice');
    testDb.run(`UPDATE notes SET updated_at = '2020-01-01 00:00:00' WHERE id = ?`, [note.id]);

    const updated = await updateNote('alice', note.id, {
      title: 'Renamed',
      contentJson: DOC,
      isPublic: false,
    });
    expect(updated).toMatchObject({ title: 'Renamed', contentJson: DOC });
    expect(updated?.updatedAt).not.toBe('2020-01-01 00:00:00');
  });

  it('keeps the slug while shared, clears it on unshare, and mints a new one on reshare', async () => {
    const note = await createNote('alice', { isPublic: true });
    const input = { title: 'T', contentJson: DOC };

    const stillShared = await updateNote('alice', note.id, { ...input, isPublic: true });
    expect(stillShared?.publicSlug).toBe(note.publicSlug);

    const unshared = await updateNote('alice', note.id, { ...input, isPublic: false });
    expect(unshared).toMatchObject({ isPublic: false, publicSlug: null });

    const reshared = await updateNote('alice', note.id, { ...input, isPublic: true });
    expect(reshared?.publicSlug).toEqual(expect.any(String));
    expect(reshared?.publicSlug).not.toBe(note.publicSlug);
  });

  it("returns null for another user's note and leaves it unchanged", async () => {
    const note = await createNote('alice', { title: 'Mine' });
    expect(
      await updateNote('bob', note.id, { title: 'Hijacked', contentJson: DOC, isPublic: true }),
    ).toBeNull();
    expect((await getNoteById('alice', note.id))?.title).toBe('Mine');
  });
});

describe('deleteNote', () => {
  it('deletes the note for its owner', async () => {
    const note = await createNote('alice');
    expect(await deleteNote('alice', note.id)).toBe(true);
    expect(await getNoteById('alice', note.id)).toBeNull();
  });

  it("returns false for another user's or a missing note", async () => {
    const note = await createNote('alice');
    expect(await deleteNote('bob', note.id)).toBe(false);
    expect(await deleteNote('alice', 'missing')).toBe(false);
    expect(await getNoteById('alice', note.id)).not.toBeNull();
  });
});

describe('getNoteByPublicSlug', () => {
  it('returns a shared note by slug', async () => {
    const note = await createNote('alice', { isPublic: true });
    expect(await getNoteByPublicSlug(note.publicSlug!)).toEqual(note);
  });

  it('returns null once the note is unshared or for unknown slugs', async () => {
    const note = await createNote('alice', { isPublic: true });
    await updateNote('alice', note.id, { title: 'T', contentJson: DOC, isPublic: false });
    expect(await getNoteByPublicSlug(note.publicSlug!)).toBeNull();
    expect(await getNoteByPublicSlug('nope')).toBeNull();
  });
});
