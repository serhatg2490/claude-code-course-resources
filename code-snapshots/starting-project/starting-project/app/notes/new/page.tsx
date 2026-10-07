import type { Metadata } from 'next';

import { createNoteAction } from './actions';
import { NoteForm } from '@/components/note-form';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'New note · NextNotes',
};

export default async function NewNotePage() {
  await requireUser();

  return (
    <main className='page-container flex flex-1 flex-col gap-6 py-10'>
      <h1 className='text-3xl font-semibold tracking-tight'>New note</h1>
      <NoteForm action={createNoteAction} submitLabel='Create note' pendingLabel='Saving…' />
    </main>
  );
}
