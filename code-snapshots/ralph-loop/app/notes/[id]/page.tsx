import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { NoteEditor } from '@/components/NoteEditor';
import { requireAuth } from '@/lib/auth';
import { parseNoteContent } from '@/lib/note-content';
import { getNoteById } from '@/lib/notes';

/** Note ids come from `crypto.randomUUID()`, so anything else can't match a note. */
const noteIdSchema = z.uuid();

/**
 * The signed-in user's note, or a 404 for a missing note, someone else's note, or a malformed id alike.
 * Cached per request, so `generateMetadata` and the page share one lookup.
 */
const loadNote = cache(async (noteId: string) => {
  const { user } = await requireAuth();
  const id = noteIdSchema.safeParse(noteId);
  if (!id.success) {
    notFound();
  }
  const note = await getNoteById(user.id, id.data);
  if (!note) {
    notFound();
  }
  return note;
});

export async function generateMetadata({ params }: PageProps<'/notes/[id]'>): Promise<Metadata> {
  const note = await loadNote((await params).id);
  return { title: note.title };
}

/** Edits one of the signed-in user's notes. Visitors without a session are sent to log in. */
export default async function NotePage({ params }: PageProps<'/notes/[id]'>) {
  const note = await loadNote((await params).id);

  const content = parseNoteContent(note.contentJson);
  if (!content) {
    // Writes are validated, so this means the stored row is corrupt. Fail loudly instead of opening an
    // empty editor that a later save could write over the original content.
    throw new Error(`Note ${note.id} has invalid content`);
  }

  return (
    <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10'>
      <h1 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100'>
        {note.title}
      </h1>
      <NoteEditor initialContent={content} />
    </main>
  );
}
