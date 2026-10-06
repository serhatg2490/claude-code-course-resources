import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { updateNoteAction } from '../actions';
import { NoteForm } from '@/components/note-form';
import { requireUser } from '@/lib/auth';
import { parseNoteContent } from '@/lib/note-schemas';
import { getNoteById } from '@/lib/notes';

type EditNotePageProps = {
  params: Promise<{ id: string }>;
};

async function loadNote(params: EditNotePageProps['params']) {
  const user = await requireUser();
  const { id } = await params;
  const note = await getNoteById(user.id, id);
  if (!note) notFound();
  return note;
}

export async function generateMetadata({ params }: EditNotePageProps): Promise<Metadata> {
  const note = await loadNote(params);
  return { title: `Edit ${note.title} · NextNotes` };
}

export default async function EditNotePage({ params }: EditNotePageProps) {
  const note = await loadNote(params);

  return (
    <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10'>
      <Link
        href={`/notes/${note.id}`}
        className='self-start rounded-sm text-sm text-neutral-500 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link'
      >
        ← Back to note
      </Link>
      <h1 className='text-3xl font-semibold tracking-tight'>Edit note</h1>
      <NoteForm
        action={updateNoteAction.bind(null, note.id)}
        initialTitle={note.title}
        initialContent={parseNoteContent(note.contentJson)}
        initialIsPublic={note.isPublic}
        publicSlug={note.publicSlug}
        submitLabel='Save changes'
        pendingLabel='Saving…'
      />
    </main>
  );
}
