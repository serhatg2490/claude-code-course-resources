import { nanoid } from 'nanoid';

import { get, query, run } from '@/lib/db';
import { DEFAULT_NOTE_TITLE, EMPTY_DOC_JSON } from '@/lib/note-schemas';

export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string; // stringified TipTap doc
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

function toNote(row: NoteRow): Note {
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

export async function createNote(
  userId: string,
  data: { title?: string; contentJson?: string; isPublic?: boolean } = {},
): Promise<Note> {
  const row = get<NoteRow>(
    `INSERT INTO notes (id, user_id, title, content_json, is_public, public_slug)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [
      crypto.randomUUID(),
      userId,
      data.title || DEFAULT_NOTE_TITLE,
      data.contentJson ?? EMPTY_DOC_JSON,
      data.isPublic ? 1 : 0,
      data.isPublic ? nanoid() : null,
    ],
  );

  if (!row) throw new Error('Failed to create note.');
  return toNote(row);
}

export async function getNotesByUser(userId: string): Promise<Note[]> {
  const rows = query<NoteRow>(`SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC`, [
    userId,
  ]);
  return rows.map(toNote);
}

export async function getNoteById(userId: string, noteId: string): Promise<Note | null> {
  const row = get<NoteRow>(`SELECT * FROM notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
  return row ? toNote(row) : null;
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: { title: string; contentJson: string; isPublic: boolean },
): Promise<Note | null> {
  // Keeps an existing slug while shared; clearing it on unshare makes the old link dead for good.
  const row = get<NoteRow>(
    `UPDATE notes
     SET title = ?,
         content_json = ?,
         is_public = ?,
         public_slug = CASE WHEN ? THEN COALESCE(public_slug, ?) ELSE NULL END,
         updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
     RETURNING *`,
    [
      data.title || DEFAULT_NOTE_TITLE,
      data.contentJson,
      data.isPublic ? 1 : 0,
      data.isPublic ? 1 : 0,
      nanoid(),
      noteId,
      userId,
    ],
  );
  return row ? toNote(row) : null;
}

/** Hard delete; returns false when no note with that id belongs to the user. */
export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  const result = run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
  return result.changes > 0;
}

/** Unauthenticated lookup for `/p/[slug]`; only returns notes that are currently shared. */
export async function getNoteByPublicSlug(slug: string): Promise<Note | null> {
  const row = get<NoteRow>(`SELECT * FROM notes WHERE public_slug = ? AND is_public = 1`, [slug]);
  return row ? toNote(row) : null;
}
