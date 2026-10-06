import Link from 'next/link';

import { formatSqliteDate } from '@/lib/format-date';
import type { Note } from '@/lib/notes';

type NoteListProps = {
  notes: Pick<Note, 'id' | 'title' | 'updatedAt' | 'isPublic'>[];
};

export function NoteList({ notes }: NoteListProps): React.JSX.Element {
  if (notes.length === 0) {
    return (
      <div className='rounded-md border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700'>
        <p className='font-medium'>No notes yet</p>
        <p className='mt-1 text-sm text-neutral-500'>
          <Link
            href='/notes/new'
            className='text-link underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link'
          >
            Create your first note
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ul className='flex flex-col gap-3'>
      {notes.map((note) => {
        const updated = formatSqliteDate(note.updatedAt);
        return (
          <li key={note.id}>
            <Link
              href={`/notes/${note.id}`}
              className='flex items-center justify-between gap-4 rounded-md border border-neutral-200 px-4 py-3 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link dark:border-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-900'
            >
              <div className='min-w-0'>
                <h2 className='truncate font-medium'>{note.title}</h2>
                <p className='mt-0.5 text-sm text-neutral-500'>
                  Updated <time dateTime={updated.iso}>{updated.label}</time>
                </p>
              </div>
              {note.isPublic && (
                <span className='shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'>
                  Public
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
