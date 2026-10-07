import Link from 'next/link';

import { NoteList } from '@/components/note-list';
import { requireUser } from '@/lib/auth';
import { getNotesByUser } from '@/lib/notes';

export default async function DashboardPage() {
  const user = await requireUser();
  const notes = await getNotesByUser(user.id);

  return (
    <main className='page-container flex flex-1 flex-col gap-6 py-10'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Dashboard</h1>
        <Link
          href='/notes/new'
          className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link'
        >
          New Note
        </Link>
      </div>
      <NoteList notes={notes} />
    </main>
  );
}
