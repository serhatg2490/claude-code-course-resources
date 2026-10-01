'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createNoteAction } from '@/lib/actions/notes';
import type { ActionResult } from '@/lib/actions/result';
import type { Note } from '@/lib/notes';
import { notePath } from '@/lib/routes';

const CREATE_FAILED = 'Could not create the note. Please try again.';

/** Creates an untitled note for the signed-in user, then opens it in the editor. */
export function CreateNoteButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    // The navigation runs inside the transition, so the button stays disabled until the editor
    // starts loading and a double click can't create two notes.
    startTransition(async () => {
      const result = await submitCreateNote();
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(notePath(result.data.id));
    });
  }

  return (
    <div className='ml-auto flex shrink-0 flex-col items-end gap-2'>
      <button
        type='button'
        onClick={handleClick}
        disabled={isPending}
        className='rounded-md bg-zinc-900 px-4 py-2 text-sm whitespace-nowrap font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100'
      >
        {isPending ? 'Creating…' : 'New note'}
      </button>
      {error && (
        <p role='alert' className='max-w-56 text-right text-sm text-red-700 dark:text-red-400'>
          {error}
        </p>
      )}
    </div>
  );
}

/** Creates an untitled note. Network failures become a failed result too. */
async function submitCreateNote(): Promise<ActionResult<Note>> {
  try {
    return await createNoteAction();
  } catch {
    // Network failures throw instead of returning `{ success: false }`.
    return { success: false, error: CREATE_FAILED };
  }
}
