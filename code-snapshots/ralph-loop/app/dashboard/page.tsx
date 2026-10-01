import type { Metadata } from 'next';
import { CreateNoteButton } from '@/components/CreateNoteButton';
import { NoteList } from '@/components/NoteList';
import { requireAuth } from '@/lib/auth';
import { getNotesByUser } from '@/lib/notes';

export const metadata: Metadata = {
  title: 'Your notes',
};

/** The signed-in user's notes, most recently updated first. Visitors without a session are sent to log in. */
export default async function DashboardPage() {
  const { user } = await requireAuth();
  const notes = await getNotesByUser(user.id);

  return (
    <main className='mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10'>
      <div className='flex flex-wrap items-start justify-between gap-x-4 gap-y-3'>
        <div className='flex flex-1 basis-48 flex-col gap-1'>
          <h1 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100'>
            Your notes
          </h1>
          {notes.length > 0 && (
            <p className='text-zinc-600 dark:text-zinc-400'>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}, most recently updated first.
            </p>
          )}
        </div>
        <CreateNoteButton />
      </div>

      <NoteList notes={notes} now={new Date()} />
    </main>
  );
}
