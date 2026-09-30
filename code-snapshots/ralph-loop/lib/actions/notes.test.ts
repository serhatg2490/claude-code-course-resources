import { afterEach, beforeEach, describe, expect, mock, spyOn, test, type Mock } from 'bun:test';
import * as cacheModule from 'next/cache';
import * as authModule from '../auth';
import { SIGN_IN_PATH, type Session } from '../auth';
import { closeDb, get, run } from '../db';
import * as notesModule from '../notes';
import { DEFAULT_NOTE_TITLE, EMPTY_DOC_JSON, getNotesByUser } from '../notes';
import { createNoteAction } from './notes';

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
