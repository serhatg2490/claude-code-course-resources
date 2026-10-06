import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeleteNoteButton } from '@/components/delete-note-button';
import { NoteRenderer } from '@/components/note-renderer';
import { ShareLink } from '@/components/share-link';
import { requireUser } from '@/lib/auth';
import { formatSqliteDate } from '@/lib/format-date';
import { parseNoteContent } from '@/lib/note-schemas';
import { getNoteById } from '@/lib/notes';

type NotePageProps = {
  params: Promise<{ id: string }>;
};

async function loadNote(params: NotePageProps['params']) {
  const user = await requireUser();
  const { id } = await params;
  const note = await getNoteById(user.id, id);
  if (!note) notFound();
  return note;
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const note = await loadNote(params);
  return { title: `${note.title} · NextNotes` };
}

export default async function NotePage({ params }: NotePageProps) {
  const note = await loadNote(params);
  const updated = formatSqliteDate(note.updatedAt);

  return (
    <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10'>
      <Link
        href='/dashboard'
        className='self-start rounded-sm text-sm text-neutral-500 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link'
      >
        ← Back to dashboard
      </Link>
      <article className='flex flex-col gap-6'>
        <header className='border-b border-neutral-200 pb-4 dark:border-neutral-800'>
          <h1 className='text-4xl font-semibold tracking-tight'>{note.title}</h1>
          <p className='mt-2 text-sm text-neutral-500'>
            Updated <time dateTime={updated.iso}>{updated.label}</time>
            {note.isPublic && ' · Public'}
          </p>
          {note.publicSlug && (
            <div className='mt-2'>
              <ShareLink slug={note.publicSlug} />
            </div>
          )}
          <div className='mt-4 flex gap-2'>
            <Link
              href={`/notes/${note.id}/edit`}
              className='rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link dark:border-neutral-700 dark:hover:bg-neutral-900'
            >
              Edit
            </Link>
            <DeleteNoteButton noteId={note.id} title={note.title} />
          </div>
        </header>
        <NoteRenderer content={parseNoteContent(note.contentJson)} />
      </article>
    </main>
  );
}
