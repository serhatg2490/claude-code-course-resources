'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '../auth';
import {
  DEFAULT_NOTE_TITLE,
  createNote,
  deleteNote,
  getNoteById,
  setNotePublic,
  updateNote,
  type Note,
} from '../notes';
import { isTipTapDocJson } from '../note-content';
import { DASHBOARD_PATH, notePath, publicNotePath } from '../routes';
import type { ActionResult } from './result';

const NOT_FOUND_ERROR = 'Note not found';

const MAX_TITLE_LENGTH = 200;

/** Matches the default 1 MB body limit Next.js applies to server actions. */
const MAX_CONTENT_JSON_LENGTH = 1_000_000;

/** A blank title falls back to the default, so clearing the title field never leaves a note nameless. */
const titleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
  .transform((title) => title || DEFAULT_NOTE_TITLE);

/** A stringified TipTap document, stored as-is in `notes.content_json`. */
const contentJsonSchema = z
  .string()
  .max(MAX_CONTENT_JSON_LENGTH, 'Note content is too large')
  .refine(isTipTapDocJson, 'Note content must be a TipTap document');

/** Note ids come from `crypto.randomUUID()`, so anything else can't match a note. */
const noteIdSchema = z.uuid(NOT_FOUND_ERROR);

const isPublicSchema = z.boolean('Sharing must be turned on or off');

// Strict, so a client can't slip in fields like `userId`: the owner always comes from the session.
const noteFieldsSchema = z.strictObject({
  title: titleSchema.optional(),
  contentJson: contentJsonSchema.optional(),
});

export type CreateNoteInput = z.input<typeof noteFieldsSchema>;
export type UpdateNoteInput = z.input<typeof noteFieldsSchema>;

function invalidInput(error: z.ZodError): ActionResult<never> {
  return { success: false, error: error.issues[0]?.message ?? 'Invalid input' };
}

/**
 * Creates a note owned by the signed-in user. With no input, it's an untitled note with an empty document.
 * Redirects to the sign-in page when there is no session.
 */
export async function createNoteAction(input: CreateNoteInput = {}): Promise<ActionResult<Note>> {
  // Outside the try/catch: `requireAuth()` redirects by throwing.
  const { user } = await requireAuth();

  const parsed = noteFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  let note: Note;
  try {
    note = await createNote(user.id, parsed.data);
  } catch (error) {
    console.error('Failed to create note', error);
    return { success: false, error: 'Could not create the note. Please try again.' };
  }

  revalidatePath(DASHBOARD_PATH);
  return { success: true, data: note };
}

/**
 * Updates the title and/or content of a note owned by the signed-in user. Omitted fields are left unchanged.
 * Returns "Note not found" for missing notes and for notes owned by someone else alike.
 * Redirects to the sign-in page when there is no session.
 */
export async function updateNoteAction(
  noteId: string,
  input: UpdateNoteInput,
): Promise<ActionResult<Note>> {
  const { user } = await requireAuth();

  const parsedId = noteIdSchema.safeParse(noteId);
  if (!parsedId.success) {
    return invalidInput(parsedId.error);
  }
  const parsed = noteFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  let note: Note | null;
  try {
    // Scoped by user id in SQL, so this is also the ownership check.
    note = await updateNote(user.id, parsedId.data, parsed.data);
  } catch (error) {
    console.error('Failed to update note', error);
    return { success: false, error: 'Could not save the note. Please try again.' };
  }
  if (!note) {
    return { success: false, error: NOT_FOUND_ERROR };
  }

  revalidateNote(note);
  return { success: true, data: note };
}

/**
 * Permanently deletes a note owned by the signed-in user.
 * Returns "Note not found" for missing notes and for notes owned by someone else alike.
 * Redirects to the sign-in page when there is no session.
 */
export async function deleteNoteAction(noteId: string): Promise<ActionResult<null>> {
  const { user } = await requireAuth();

  const parsedId = noteIdSchema.safeParse(noteId);
  if (!parsedId.success) {
    return invalidInput(parsedId.error);
  }

  let note: Note | null;
  try {
    // Read first (scoped by user id, so this is the ownership check) to know which public page to invalidate.
    note = await getNoteById(user.id, parsedId.data);
    if (note && !(await deleteNote(user.id, note.id))) {
      // Deleted by a concurrent request in between.
      note = null;
    }
  } catch (error) {
    console.error('Failed to delete note', error);
    return { success: false, error: 'Could not delete the note. Please try again.' };
  }
  if (!note) {
    return { success: false, error: NOT_FOUND_ERROR };
  }

  revalidateNote(note);
  return { success: true, data: null };
}

/**
 * Turns public sharing on or off for a note owned by the signed-in user. Enabling keeps an existing slug or
 * generates one; disabling clears it, so the old public URL returns 404. Returns the note with its `publicSlug`.
 * Returns "Note not found" for missing notes and for notes owned by someone else alike.
 * Redirects to the sign-in page when there is no session.
 */
export async function toggleShareAction(
  noteId: string,
  isPublic: boolean,
): Promise<ActionResult<Note>> {
  const { user } = await requireAuth();

  const parsedId = noteIdSchema.safeParse(noteId);
  if (!parsedId.success) {
    return invalidInput(parsedId.error);
  }
  const parsedIsPublic = isPublicSchema.safeParse(isPublic);
  if (!parsedIsPublic.success) {
    return invalidInput(parsedIsPublic.error);
  }

  let previous: Note | null;
  let note: Note | null = null;
  try {
    // Read first (scoped by user id, so this is the ownership check) to know the slug that disabling clears.
    previous = await getNoteById(user.id, parsedId.data);
    if (previous) {
      // Null if the note was deleted by a concurrent request in between.
      note = await setNotePublic(user.id, previous.id, parsedIsPublic.data);
    }
  } catch (error) {
    console.error('Failed to update note sharing', error);
    return { success: false, error: 'Could not update sharing. Please try again.' };
  }
  if (!previous || !note) {
    return { success: false, error: NOT_FOUND_ERROR };
  }

  revalidateNote(note);
  if (previous.publicSlug && previous.publicSlug !== note.publicSlug) {
    // The note is no longer public: stop serving the old public page from cache.
    revalidatePath(publicNotePath(previous.publicSlug));
  }
  return { success: true, data: note };
}

/**
 * Invalidates every page that shows the note. Next.js also re-renders the caller's current route in the action
 * response, so client components must treat their note props as initial values rather than resetting from them.
 */
function revalidateNote(note: Note) {
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(notePath(note.id));
  if (note.publicSlug) {
    revalidatePath(publicNotePath(note.publicSlug));
  }
}
