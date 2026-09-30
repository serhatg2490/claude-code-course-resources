import { afterEach, beforeEach, describe, expect, mock, spyOn, test, type Mock } from 'bun:test';
import * as cacheModule from 'next/cache';
import * as authModule from '../auth';
import { SIGN_IN_PATH, type Session } from '../auth';
import { closeDb, get, run } from '../db';
import * as notesModule from '../notes';
import {
  DEFAULT_NOTE_TITLE,
  EMPTY_DOC_JSON,
  createNote,
  getNoteById,
  getNoteByPublicSlug,
  getNotesByUser,
  setNotePublic,
  type Note,
} from '../notes';
import { createNoteAction, deleteNoteAction, toggleShareAction, updateNoteAction } from './notes';
import type { ActionResult } from './result';

// Spies (restored after each test) rather than `mock.module`, which would leak into later test files
// that import the real `lib/auth.ts`.

/** Stands in for the error `redirect()` throws, so tests can assert on the target. */
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`Redirected to ${url}`);
  }
}

function sessionFor(userId: string): Session {
  const now = new Date();
  return {
    user: {
      id: userId,
      name: 'Ada',
      email: 'ada@example.com',
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: 'session-1',
      userId,
      token: 'token-1',
      expiresAt: new Date(now.getTime() + 60_000),
      ipAddress: null,
      userAgent: null,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function signInAs(userId: string) {
  return spyOn(authModule, 'requireAuth').mockResolvedValue(sessionFor(userId));
}

function signOut() {
  return spyOn(authModule, 'requireAuth').mockRejectedValue(new RedirectError(SIGN_IN_PATH));
}

function countNotes(): number {
  return get<{ count: number }>('SELECT COUNT(*) AS count FROM notes')?.count ?? 0;
}

let revalidatePath: Mock<typeof cacheModule.revalidatePath>;

beforeEach(() => {
  process.env.DATABASE_PATH = ':memory:';
  run("INSERT INTO user (id, name, email) VALUES ('user-1', 'Ada', 'ada@example.com')");
  run("INSERT INTO user (id, name, email) VALUES ('user-2', 'Grace', 'grace@example.com')");
  revalidatePath = spyOn(cacheModule, 'revalidatePath').mockImplementation(() => {});
});

afterEach(() => {
  mock.restore();
  closeDb();
});

describe('createNoteAction', () => {
  test('creates an untitled note with an empty document for the signed-in user', async () => {
    signInAs('user-1');

    const result = await createNoteAction();

    expect(result).toMatchObject({
      success: true,
      data: {
        userId: 'user-1',
        title: DEFAULT_NOTE_TITLE,
        contentJson: EMPTY_DOC_JSON,
        isPublic: false,
        publicSlug: null,
      },
    });
    const notes = await getNotesByUser('user-1');
    expect(notes).toHaveLength(1);
    expect(result.success && result.data).toEqual(notes[0]);
    expect(await getNotesByUser('user-2')).toEqual([]);
  });

  test('revalidates the dashboard', async () => {
    signInAs('user-1');

    await createNoteAction();

    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });

  test('uses the provided title (trimmed) and content', async () => {
    signInAs('user-1');
    const contentJson = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    });

    const result = await createNoteAction({ title: '  Groceries  ', contentJson });

    expect(result).toMatchObject({ success: true, data: { title: 'Groceries', contentJson } });
  });

  test('falls back to the default title when the title is blank', async () => {
    signInAs('user-1');

    const result = await createNoteAction({ title: '   ' });

    expect(result).toMatchObject({ success: true, data: { title: DEFAULT_NOTE_TITLE } });
  });

  test('accepts a title of exactly the maximum length', async () => {
    signInAs('user-1');

    const result = await createNoteAction({ title: 'a'.repeat(200) });

    expect(result.success).toBe(true);
  });

  test.each([
    [
      'a title that is too long',
      { title: 'a'.repeat(201) },
      'Title must be at most 200 characters',
    ],
    [
      'content that is not JSON',
      { contentJson: 'not json' },
      'Note content must be a TipTap document',
    ],
    [
      'JSON that is not a TipTap document',
      { contentJson: JSON.stringify({ type: 'paragraph' }) },
      'Note content must be a TipTap document',
    ],
    [
      'a document with untyped child nodes',
      { contentJson: JSON.stringify({ type: 'doc', content: [{ text: 'hi' }] }) },
      'Note content must be a TipTap document',
    ],
    [
      'content that is too large',
      { contentJson: JSON.stringify({ type: 'doc', padding: 'a'.repeat(1_000_000) }) },
      'Note content is too large',
    ],
  ])('rejects %s without creating a note', async (_case, input, error) => {
    signInAs('user-1');

    const result = await createNoteAction(input);

    expect(result).toEqual({ success: false, error });
    expect(countNotes()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('rejects a userId in the input, so notes are always owned by the session user', async () => {
    signInAs('user-1');
    // Simulates a tampered request. TypeScript only flags extra keys on inline object literals, and at
    // runtime a client can send any payload.
    const tampered = { title: 'Mine now', userId: 'user-2' };

    const result = await createNoteAction(tampered);

    expect(result.success).toBe(false);
    expect(countNotes()).toBe(0);
  });

  test('redirects to the sign-in page when signed out, without creating a note', async () => {
    signOut();

    await expect(createNoteAction()).rejects.toThrow(new RedirectError(SIGN_IN_PATH));
    expect(countNotes()).toBe(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns a friendly error when the database write fails', async () => {
    signInAs('user-1');
    spyOn(notesModule, 'createNote').mockRejectedValue(new Error('SQLITE_FULL: database is full'));
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});

    const result = await createNoteAction();

    expect(result).toEqual({
      success: false,
      error: 'Could not create the note. Please try again.',
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateNoteAction', () => {
  const OLD_TIMESTAMP = '2020-01-01 00:00:00';
  const helloDoc = JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
  });

  /** A note owned by `userId` with an old `updated_at`, so a bump is visible despite 1-second resolution. */
  async function seedNote(userId: string): Promise<Note> {
    const note = await createNote(userId, { title: 'Original' });
    run('UPDATE notes SET updated_at = ? WHERE id = ?', [OLD_TIMESTAMP, note.id]);
    return { ...note, updatedAt: OLD_TIMESTAMP };
  }

  test('updates the title and content of the signed-in user’s note', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const result = await updateNoteAction(note.id, {
      title: '  Groceries  ',
      contentJson: helloDoc,
    });

    expect(result).toMatchObject({
      success: true,
      data: { id: note.id, userId: 'user-1', title: 'Groceries', contentJson: helloDoc },
    });
    expect(result.success && result.data).toEqual(await getNoteById('user-1', note.id));
  });

  test('bumps updated_at and keeps created_at', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const result = await updateNoteAction(note.id, { title: 'New' });

    expect(result.success && result.data.updatedAt).not.toBe(OLD_TIMESTAMP);
    expect(result.success && result.data.createdAt).toBe(note.createdAt);
  });

  test('leaves omitted fields unchanged', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const titleOnly = await updateNoteAction(note.id, { title: 'New title' });
    expect(titleOnly).toMatchObject({
      success: true,
      data: { title: 'New title', contentJson: EMPTY_DOC_JSON },
    });

    const contentOnly = await updateNoteAction(note.id, { contentJson: helloDoc });
    expect(contentOnly).toMatchObject({
      success: true,
      data: { title: 'New title', contentJson: helloDoc },
    });
  });

  test('falls back to the default title when the title is cleared', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const result = await updateNoteAction(note.id, { title: '  ' });

    expect(result).toMatchObject({ success: true, data: { title: DEFAULT_NOTE_TITLE } });
  });

  test('revalidates the dashboard and the note page', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    await updateNoteAction(note.id, { title: 'New' });

    expect(revalidatePath.mock.calls).toEqual([['/dashboard'], [`/notes/${note.id}`]]);
  });

  test('also revalidates the public page of a shared note', async () => {
    const note = await seedNote('user-1');
    const shared = await setNotePublic('user-1', note.id, true);
    signInAs('user-1');

    await updateNoteAction(note.id, { title: 'New' });

    expect(revalidatePath).toHaveBeenCalledWith(`/p/${shared?.publicSlug}`);
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });

  test('returns "Note not found" for another user’s note and leaves it untouched', async () => {
    const note = await seedNote('user-2');
    signInAs('user-1');

    const result = await updateNoteAction(note.id, { title: 'Hijacked' });

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(await getNoteById('user-2', note.id)).toMatchObject({
      title: 'Original',
      updatedAt: OLD_TIMESTAMP,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    ['a missing note', crypto.randomUUID()],
    ['an id that is not a UUID', 'not-a-note-id'],
  ])('returns "Note not found" for %s', async (_case, noteId) => {
    signInAs('user-1');

    const result = await updateNoteAction(noteId, { title: 'New' });

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    [
      'a title that is too long',
      { title: 'a'.repeat(201) },
      'Title must be at most 200 characters',
    ],
    [
      'JSON that is not a TipTap document',
      { contentJson: JSON.stringify({ type: 'paragraph' }) },
      'Note content must be a TipTap document',
    ],
  ])('rejects %s without changing the note', async (_case, input, error) => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const result = await updateNoteAction(note.id, input);

    expect(result).toEqual({ success: false, error });
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('rejects a userId in the input, so a note can’t be moved to another user', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');
    const tampered = { title: 'Yours now', userId: 'user-2' };

    const result = await updateNoteAction(note.id, tampered);

    expect(result.success).toBe(false);
    expect(await getNoteById('user-1', note.id)).toEqual(note);
  });

  test('redirects to the sign-in page when signed out, without changing the note', async () => {
    const note = await seedNote('user-1');
    signOut();

    await expect(updateNoteAction(note.id, { title: 'New' })).rejects.toThrow(
      new RedirectError(SIGN_IN_PATH),
    );
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns a friendly error when the database write fails', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');
    spyOn(notesModule, 'updateNote').mockRejectedValue(
      new Error('SQLITE_BUSY: database is locked'),
    );
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateNoteAction(note.id, { title: 'New' });

    expect(result).toEqual({ success: false, error: 'Could not save the note. Please try again.' });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteNoteAction', () => {
  test('deletes the signed-in user’s note', async () => {
    const note = await createNote('user-1', { title: 'Doomed' });
    const kept = await createNote('user-1', { title: 'Kept' });
    signInAs('user-1');

    const result = await deleteNoteAction(note.id);

    expect(result).toEqual({ success: true, data: null });
    expect(await getNoteById('user-1', note.id)).toBeNull();
    expect(await getNotesByUser('user-1')).toEqual([kept]);
  });

  test('revalidates the dashboard and the note page', async () => {
    const note = await createNote('user-1');
    signInAs('user-1');

    await deleteNoteAction(note.id);

    expect(revalidatePath.mock.calls).toEqual([['/dashboard'], [`/notes/${note.id}`]]);
  });

  test('also revalidates the public page of a shared note, which then stops resolving', async () => {
    const note = await createNote('user-1');
    const shared = await setNotePublic('user-1', note.id, true);
    const slug = shared?.publicSlug ?? '';
    signInAs('user-1');

    await deleteNoteAction(note.id);

    expect(revalidatePath).toHaveBeenCalledWith(`/p/${slug}`);
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    expect(await getNoteByPublicSlug(slug)).toBeNull();
  });

  test('returns "Note not found" for another user’s note and leaves it in place', async () => {
    const note = await createNote('user-2');
    signInAs('user-1');

    const result = await deleteNoteAction(note.id);

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(await getNoteById('user-2', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    ['a missing note', crypto.randomUUID()],
    ['an id that is not a UUID', 'not-a-note-id'],
  ])('returns "Note not found" for %s', async (_case, noteId) => {
    await createNote('user-1');
    signInAs('user-1');

    const result = await deleteNoteAction(noteId);

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(countNotes()).toBe(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns "Note not found" when the note is already deleted', async () => {
    const note = await createNote('user-1');
    signInAs('user-1');

    await deleteNoteAction(note.id);
    revalidatePath.mockClear();
    const result = await deleteNoteAction(note.id);

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns "Note not found" when the note disappears between the read and the delete', async () => {
    const note = await createNote('user-1');
    signInAs('user-1');
    spyOn(notesModule, 'deleteNote').mockResolvedValue(false);

    const result = await deleteNoteAction(note.id);

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('redirects to the sign-in page when signed out, without deleting the note', async () => {
    const note = await createNote('user-1');
    signOut();

    await expect(deleteNoteAction(note.id)).rejects.toThrow(new RedirectError(SIGN_IN_PATH));
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns a friendly error when the database write fails', async () => {
    const note = await createNote('user-1');
    signInAs('user-1');
    spyOn(notesModule, 'deleteNote').mockRejectedValue(
      new Error('SQLITE_BUSY: database is locked'),
    );
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});

    const result = await deleteNoteAction(note.id);

    expect(result).toEqual({
      success: false,
      error: 'Could not delete the note. Please try again.',
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('toggleShareAction', () => {
  const OLD_TIMESTAMP = '2020-01-01 00:00:00';

  /** A note owned by `userId` with an old `updated_at`, so a bump is visible despite 1-second resolution. */
  async function seedNote(userId: string, { shared = false } = {}): Promise<Note> {
    const created = await createNote(userId, { title: 'Original' });
    const note = shared ? await setNotePublic(userId, created.id, true) : created;
    run('UPDATE notes SET updated_at = ? WHERE id = ?', [OLD_TIMESTAMP, created.id]);
    return { ...(note ?? created), updatedAt: OLD_TIMESTAMP };
  }

  test('enables sharing with a new public slug that resolves the note', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const result = await toggleShareAction(note.id, true);

    expect(result).toMatchObject({ success: true, data: { id: note.id, isPublic: true } });
    const slug = result.success ? result.data.publicSlug : null;
    expect(slug).toEqual(expect.any(String));
    expect(await getNoteByPublicSlug(slug ?? '')).toEqual(result.success ? result.data : null);
  });

  test('keeps the existing slug when the note is already shared', async () => {
    const note = await seedNote('user-1', { shared: true });
    signInAs('user-1');

    const result = await toggleShareAction(note.id, true);

    expect(result).toMatchObject({
      success: true,
      data: { isPublic: true, publicSlug: note.publicSlug },
    });
  });

  test('disables sharing and clears the slug, so the public URL stops resolving', async () => {
    const note = await seedNote('user-1', { shared: true });
    signInAs('user-1');

    const result = await toggleShareAction(note.id, false);

    expect(result).toMatchObject({ success: true, data: { isPublic: false, publicSlug: null } });
    expect(await getNoteByPublicSlug(note.publicSlug ?? '')).toBeNull();
  });

  test('bumps updated_at and leaves the title and content alone', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    await toggleShareAction(note.id, true);

    const updated = await getNoteById('user-1', note.id);
    expect(updated?.updatedAt).not.toBe(OLD_TIMESTAMP);
    expect(updated).toMatchObject({
      title: note.title,
      contentJson: note.contentJson,
      createdAt: note.createdAt,
    });
  });

  test('revalidates the dashboard, the note page and the new public page when enabling', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');

    const result = await toggleShareAction(note.id, true);

    const slug = result.success ? result.data.publicSlug : null;
    expect(revalidatePath.mock.calls).toEqual([
      ['/dashboard'],
      [`/notes/${note.id}`],
      [`/p/${slug}`],
    ]);
  });

  test('revalidates the old public page when disabling', async () => {
    const note = await seedNote('user-1', { shared: true });
    signInAs('user-1');

    await toggleShareAction(note.id, false);

    expect(revalidatePath.mock.calls).toEqual([
      ['/dashboard'],
      [`/notes/${note.id}`],
      [`/p/${note.publicSlug}`],
    ]);
  });

  test.each([true, false])(
    'returns "Note not found" for another user’s note and leaves it untouched (isPublic: %p)',
    async (isPublic) => {
      const note = await seedNote('user-2', { shared: !isPublic });
      signInAs('user-1');

      const result = await toggleShareAction(note.id, isPublic);

      expect(result).toEqual({ success: false, error: 'Note not found' });
      expect(await getNoteById('user-2', note.id)).toEqual(note);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  test.each([
    ['a missing note', crypto.randomUUID()],
    ['an id that is not a UUID', 'not-a-note-id'],
  ])('returns "Note not found" for %s', async (_case, noteId) => {
    signInAs('user-1');

    const result = await toggleShareAction(noteId, true);

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns "Note not found" when the note disappears between the read and the update', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');
    spyOn(notesModule, 'setNotePublic').mockResolvedValue(null);

    const result = await toggleShareAction(note.id, true);

    expect(result).toEqual({ success: false, error: 'Note not found' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('rejects a non-boolean isPublic without changing the note', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');
    // Simulates a tampered request: at runtime a client can send any payload. Method parameters are checked
    // bivariantly, so this widens the parameter type without a cast.
    const untyped: {
      call(noteId: string, isPublic: unknown): Promise<ActionResult<Note>>;
    } = { call: toggleShareAction };

    const result = await untyped.call(note.id, 'true');

    expect(result).toEqual({ success: false, error: 'Sharing must be turned on or off' });
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('redirects to the sign-in page when signed out, without changing the note', async () => {
    const note = await seedNote('user-1');
    signOut();

    await expect(toggleShareAction(note.id, true)).rejects.toThrow(new RedirectError(SIGN_IN_PATH));
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('returns a friendly error when the database write fails', async () => {
    const note = await seedNote('user-1');
    signInAs('user-1');
    spyOn(notesModule, 'setNotePublic').mockRejectedValue(
      new Error('SQLITE_BUSY: database is locked'),
    );
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});

    const result = await toggleShareAction(note.id, true);

    expect(result).toEqual({
      success: false,
      error: 'Could not update sharing. Please try again.',
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(await getNoteById('user-1', note.id)).toEqual(note);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
