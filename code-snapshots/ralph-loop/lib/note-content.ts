import type { JSONContent } from '@tiptap/react';
import { z } from 'zod';

/** Client-safe helpers for a note's stringified TipTap document (`notes.content_json`). */

/** The shape of a TipTap document: a `doc` node whose children are typed nodes. */
const tipTapDocSchema = z.looseObject({
  type: z.literal('doc'),
  content: z.array(z.looseObject({ type: z.string() })).optional(),
});

/** Parses a stringified TipTap document. Returns `null` for invalid JSON or anything that isn't a `doc` node. */
export function parseNoteContent(contentJson: string): JSONContent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return null;
  }
  const result = tipTapDocSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Whether a string is a stringified TipTap document. */
export function isTipTapDocJson(contentJson: string): boolean {
  return parseNoteContent(contentJson) !== null;
}
