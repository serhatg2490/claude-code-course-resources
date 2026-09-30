import type { JSONContent } from '@tiptap/react';
import { nanoid } from 'nanoid';
import { get, query, run } from './db';

/**
 * A note as used throughout the app (see SPEC.MD §6.2).
 */
export type Note = {
  id: string;
  userId: string;
  title: string;
  /** Stringified TipTap document. */
  contentJson: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A row of the `notes` table, exactly as SQLite returns it.
 */
export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_NOTE_TITLE = 'Untitled note';

/**
 * A stringified empty TipTap document, matching what `editor.getJSON()` returns for an empty editor.
 */
export const EMPTY_DOC_JSON = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
} satisfies JSONContent);

/**
 * 21 URL-safe characters (~126 bits of entropy), well above the 16+ chars SPEC.MD §11 asks for.
 */
export const PUBLIC_SLUG_LENGTH = 21;

/**
 * Generates an unguessable slug for a note's public URL (`/p/{slug}`).
 */
export function generatePublicSlug(): string {
  return nanoid(PUBLIC_SLUG_LENGTH);
}

/**
 * Maps a `notes` row to a `Note`: snake_case to camelCase, and the `is_public` integer to a boolean.
 */
export function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentJson: row.content_json,
    isPublic: row.is_public === 1,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateNoteData = {
  title?: string;
  /** Stringified TipTap document. */
  contentJson?: string;
};

/**
 * Creates a note owned by `userId`, defaulting to an untitled note with an empty document.
 */
export async function createNote(userId: string, data: CreateNoteData = {}): Promise<Note> {
  const row = get<NoteRow>(
    'INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?) RETURNING *',
    [
      crypto.randomUUID(),
      userId,
      data.title ?? DEFAULT_NOTE_TITLE,
      data.contentJson ?? EMPTY_DOC_JSON,
    ],
  );

  if (!row) {
    throw new Error('Failed to create note');
  }

  return toNote(row);
}

/**
 * Returns the note with `noteId` if `userId` owns it, or `null` when it doesn't exist or belongs to
 * someone else. The two cases are indistinguishable on purpose, so callers can't probe other users' ids.
 */
export async function getNoteById(userId: string, noteId: string): Promise<Note | null> {
  const row = get<NoteRow>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  return row ? toNote(row) : null;
}

/**
 * Returns every note owned by `userId`, most recently updated first.
 */
export async function getNotesByUser(userId: string): Promise<Note[]> {
  const rows = query<NoteRow>(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC',
    [userId],
  );
  return rows.map(toNote);
}

export type UpdateNoteData = {
  title?: string;
  /** Stringified TipTap document. */
  contentJson?: string;
};

/**
 * Updates the provided fields of a note owned by `userId` and bumps `updated_at`.
 * Returns the updated note, or `null` when it doesn't exist or belongs to someone else.
 * With no fields to change, the note is returned as-is without touching `updated_at`.
 */
export async function updateNote(
  userId: string,
  noteId: string,
  data: UpdateNoteData,
): Promise<Note | null> {
  if (data.title === undefined && data.contentJson === undefined) {
    return getNoteById(userId, noteId);
  }

  // Both columns are NOT NULL, so a NULL binding unambiguously means "keep the current value".
  const row = get<NoteRow>(
    `UPDATE notes
     SET title = COALESCE($title, title),
         content_json = COALESCE($contentJson, content_json),
         updated_at = datetime('now')
     WHERE id = $noteId AND user_id = $userId
     RETURNING *`,
    {
      title: data.title ?? null,
      contentJson: data.contentJson ?? null,
      noteId,
      userId,
    },
  );
  return row ? toNote(row) : null;
}

/**
 * Hard-deletes a note owned by `userId`. Returns `true` if it was deleted, or `false` when it doesn't
 * exist or belongs to someone else (the two cases are indistinguishable, as in `getNoteById`).
 */
export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  const { changes } = run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  return changes > 0;
}
