'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '../auth';
import { DEFAULT_NOTE_TITLE, createNote, type Note } from '../notes';
import type { ActionResult } from './result';

const DASHBOARD_PATH = '/dashboard';

const MAX_TITLE_LENGTH = 200;

/** Matches the default 1 MB body limit Next.js applies to server actions. */
const MAX_CONTENT_JSON_LENGTH = 1_000_000;

/** A blank title falls back to the default, so clearing the title field never leaves a note nameless. */
const titleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters`)
  .transform((title) => title || DEFAULT_NOTE_TITLE);

/** The shape of a TipTap document: a `doc` node whose children are typed nodes. */
const tipTapDocSchema = z.looseObject({
  type: z.literal('doc'),
  content: z.array(z.looseObject({ type: z.string() })).optional(),
});

function isTipTapDocJson(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return tipTapDocSchema.safeParse(parsed).success;
  } catch {
    return false;
  }
}

/** A stringified TipTap document, stored as-is in `notes.content_json`. */
const contentJsonSchema = z
  .string()
  .max(MAX_CONTENT_JSON_LENGTH, 'Note content is too large')
  .refine(isTipTapDocJson, 'Note content must be a TipTap document');

// Strict, so a client can't slip in fields like `userId`: the owner always comes from the session.
const createNoteSchema = z.strictObject({
  title: titleSchema.optional(),
  contentJson: contentJsonSchema.optional(),
});

export type CreateNoteInput = z.input<typeof createNoteSchema>;

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

  const parsed = createNoteSchema.safeParse(input);
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
