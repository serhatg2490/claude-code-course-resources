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
    <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10'>
      <h1 className='text-3xl font-semibold tracking-tight'>New note</h1>
      <NoteForm action={createNoteAction} submitLabel='Create note' pendingLabel='Saving…' />
    </main>
  );
}
