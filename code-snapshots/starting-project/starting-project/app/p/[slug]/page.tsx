import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { NoteRenderer } from '@/components/note-renderer';
import { formatSqliteDate } from '@/lib/format-date';
import { parseNoteContent } from '@/lib/note-schemas';
import { getNoteByPublicSlug } from '@/lib/notes';

type PublicNotePageProps = {
  params: Promise<{ slug: string }>;
};

// No auth: anyone with the link may read, but only while the note is shared.
async function loadPublicNote(params: PublicNotePageProps['params']) {
  const { slug } = await params;
  const note = await getNoteByPublicSlug(slug);
  if (!note) notFound();
  return note;
}

export async function generateMetadata({ params }: PublicNotePageProps): Promise<Metadata> {
  const note = await loadPublicNote(params);
  return { title: `${note.title} · NextNotes`, robots: { index: false } };
}

export default async function PublicNotePage({ params }: PublicNotePageProps) {
  const note = await loadPublicNote(params);
  const updated = formatSqliteDate(note.updatedAt);

  return (
    <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10'>
      <article className='flex flex-col gap-6'>
        <header className='border-b border-neutral-200 pb-4 dark:border-neutral-800'>
          <h1 className='text-4xl font-semibold tracking-tight'>{note.title}</h1>
          <p className='mt-2 text-sm text-neutral-500'>
            Shared note · Updated <time dateTime={updated.iso}>{updated.label}</time>
          </p>
        </header>
        <NoteRenderer content={parseNoteContent(note.contentJson)} />
      </article>
    </main>
  );
}
