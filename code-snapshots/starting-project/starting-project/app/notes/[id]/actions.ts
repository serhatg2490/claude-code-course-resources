'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth';
import { parseNoteForm, type NoteFormState } from '@/lib/note-schemas';
import { deleteNote, updateNote } from '@/lib/notes';

export async function updateNoteAction(
  noteId: string,
  _prevState: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const user = await requireUser();

  const { data, errors } = parseNoteForm(formData);
  if (errors) return errors;

  try {
    const note = await updateNote(user.id, noteId, data);
    if (!note) return { formError: 'Note not found.' };
  } catch (error) {
    console.error('updateNoteAction failed', error);
    return { formError: 'Could not save your changes. Please try again.' };
  }

  // redirect() throws, so it must stay outside the try/catch.
  redirect(`/notes/${noteId}`);
}

export type DeleteNoteState = { error?: string };

export async function deleteNoteAction(noteId: string): Promise<DeleteNoteState> {
  const user = await requireUser();

  try {
    if (!(await deleteNote(user.id, noteId))) return { error: 'Note not found.' };
  } catch (error) {
    console.error('deleteNoteAction failed', error);
    return { error: 'Could not delete the note. Please try again.' };
  }

  redirect('/dashboard');
}
