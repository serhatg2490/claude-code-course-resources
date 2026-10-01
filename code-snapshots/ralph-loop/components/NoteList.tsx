import Link from 'next/link';
import { formatRelativeTime, parseSqliteTimestamp } from '@/lib/dates';
import type { Note } from '@/lib/notes';
import { notePath } from '@/lib/routes';

/** The fields the list shows (SPEC.MD §8.3). A full `Note` fits too. */
export type NoteSummary = Pick<Note, 'id' | 'title' | 'updatedAt' | 'isPublic'>;

type NoteListProps = {
  notes: NoteSummary[];
  /** The reference time for "Updated 5 minutes ago". The caller passes it so rendering stays pure. */
  now: Date;
};

/** The signed-in user's notes as cards linking to the editor, or a short explanation when there are none. */
export function NoteList({ notes, now }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <section
        aria-labelledby='empty-notes-heading'
        className='flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700'
      >
        <h2
          id='empty-notes-heading'
          className='text-lg font-medium text-zinc-900 dark:text-zinc-100'
        >
          No notes yet
        </h2>
        <p className='max-w-sm text-zinc-600 dark:text-zinc-400'>
          Your notes will show up here. Create one to start writing, then share it with a public
          link whenever you like.
        </p>
      </section>
    );
  }

  return (
    <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {notes.map((note) => {
        const updatedAt = parseSqliteTimestamp(note.updatedAt);
        return (
          <li key={note.id}>
            <Link
              href={notePath(note.id)}
              className='flex h-full flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-100'
            >
              <h2 className='line-clamp-2 font-medium break-words text-zinc-900 dark:text-zinc-100'>
                {note.title}
              </h2>
              <div className='mt-auto flex items-center justify-between gap-2 text-sm text-zinc-500 dark:text-zinc-400'>
                <p>
                  Updated{' '}
                  <time dateTime={updatedAt.toISOString()}>
                    {formatRelativeTime(updatedAt, now)}
                  </time>
                </p>
                {note.isPublic ? (
                  <span className='rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/30'>
                    Shared
                  </span>
                ) : (
                  <span className='rounded-full px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-zinc-300 ring-inset dark:text-zinc-400 dark:ring-zinc-700'>
                    Private
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
