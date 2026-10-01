'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { signOut } from '@/lib/auth-client';
import { HOME_PATH } from '@/lib/routes';

const SIGN_OUT_FAILED = 'Could not log you out. Please try again.';

/** Signs the user out, then sends them to the landing page. */
export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      if (!(await submitSignOut())) {
        setError(SIGN_OUT_FAILED);
        return;
      }
      // `replace` so Back doesn't return to a page that now needs a session.
      router.replace(HOME_PATH);
      // Drop cached server components (the header included) rendered while signed in.
      router.refresh();
    });
  }

  return (
    <>
      <button
        type='button'
        onClick={handleClick}
        disabled={isPending}
        className='rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100'
      >
        {isPending ? 'Logging out…' : 'Log out'}
      </button>
      {error && (
        <p role='alert' className='text-sm text-red-700 dark:text-red-400'>
          {error}
        </p>
      )}
    </>
  );
}

/** Ends the session. Returns whether it worked. */
async function submitSignOut(): Promise<boolean> {
  try {
    const { error } = await signOut();
    return !error;
  } catch {
    // Network failures throw instead of returning `{ error }`.
    return false;
  }
}
