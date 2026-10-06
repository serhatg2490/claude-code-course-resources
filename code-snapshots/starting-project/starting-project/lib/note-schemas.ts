import type { JSONContent } from '@tiptap/react';
import { z } from 'zod';

export const TITLE_MAX_LENGTH = 200;
export const DEFAULT_NOTE_TITLE = 'Untitled note';
export const EMPTY_DOC_JSON = JSON.stringify({ type: 'doc', content: [] });

/** Path of a shared note's public, read-only page. */
export function toPublicPath(slug: string): string {
  return `/p/${slug}`;
}

/** A TipTap document serialized as JSON, e.g. `{"type":"doc","content":[...]}`. */
const tiptapDocJson = z.string().refine((value) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === 'object' && parsed !== null && (parsed as { type?: unknown }).type === 'doc'
    );
  } catch {
    return false;
  }
}, 'Note content is invalid.');

export const noteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters.`),
  contentJson: tiptapDocJson,
  isPublic: z.boolean(),
});

export type NoteInput = z.infer<typeof noteInputSchema>;

/** State returned by the create/update note server actions. */
export type NoteFormState = {
  fieldErrors?: { title?: string; contentJson?: string };
  formError?: string;
};

/** Validates the note form; returns either the parsed input or field errors. */
export function parseNoteForm(
  formData: FormData,
): { data: NoteInput; errors?: never } | { data?: never; errors: NoteFormState } {
  const parsed = noteInputSchema.safeParse({
    title: formData.get('title') ?? '',
    contentJson: formData.get('contentJson') ?? '',
    isPublic: formData.get('isPublic') === 'on',
  });
  if (parsed.success) return { data: parsed.data };

  const { fieldErrors } = z.flattenError(parsed.error);
  return {
    errors: {
      fieldErrors: {
        title: fieldErrors.title?.[0],
        contentJson: fieldErrors.contentJson?.[0],
      },
    },
  };
}

/** Parses stored note content, falling back to an empty document if it's corrupt. */
export function parseNoteContent(contentJson: string): JSONContent {
  try {
    return JSON.parse(contentJson) as JSONContent;
  } catch {
    return JSON.parse(EMPTY_DOC_JSON) as JSONContent;
  }
}
