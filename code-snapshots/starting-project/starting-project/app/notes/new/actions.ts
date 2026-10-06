'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth';
import { parseNoteForm, type NoteFormState } from '@/lib/note-schemas';
import { createNote } from '@/lib/notes';

export async function createNoteAction(
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const user = await requireUser();

  const { data, errors } = parseNoteForm(formData);
  if (errors) return errors;

  let noteId: string;
  try {
    const note = await createNote(user.id, data);
    noteId = note.id;
  } catch (error) {
    console.error('createNoteAction failed', error);
    return { formError: 'Could not save your note. Please try again.' };
  }

  // redirect() throws, so it must stay outside the try/catch.
  redirect(`/notes/${noteId}`);
}
