import type { JSONContent } from '@tiptap/react';
import { nanoid } from 'nanoid';
import { get } from './db';

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
