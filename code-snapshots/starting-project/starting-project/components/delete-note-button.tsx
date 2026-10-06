'use client';

import { useActionState, useRef } from 'react';

import { deleteNoteAction, type DeleteNoteState } from '@/app/notes/[id]/actions';

type DeleteNoteButtonProps = {
  noteId: string;
  title: string;
};

const initialState: DeleteNoteState = {};

export function DeleteNoteButton({ noteId, title }: DeleteNoteButtonProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = `delete-note-heading-${noteId}`;
  const [state, formAction, isPending] = useActionState(
    () => deleteNoteAction(noteId),
    initialState,
  );

  return (
    <>
      <button
        type='button'
        onClick={() => dialogRef.current?.showModal()}
        className='rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950'
      >
        Delete
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        className='m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-neutral-200 bg-background p-6 text-foreground shadow-xl backdrop:bg-black/50 dark:border-neutral-800'
      >
        <h2 id={headingId} className='text-lg font-semibold'>
          Delete this note?
        </h2>
        <p className='mt-2 text-sm text-neutral-500'>
          <span className='font-medium text-foreground'>{title}</span> will be permanently deleted.
          This can&apos;t be undone.
        </p>
        {state.error && (
          <p role='alert' className='mt-3 text-sm text-red-600 dark:text-red-400'>
            {state.error}
          </p>
        )}
        <form action={formAction} className='mt-6 flex justify-end gap-2'>
          <button
            type='button'
            autoFocus
            disabled={isPending}
            onClick={() => dialogRef.current?.close()}
            className='rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={isPending}
            className='rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60'
          >
            {isPending ? 'Deleting…' : 'Delete note'}
          </button>
        </form>
      </dialog>
    </>
  );
}
