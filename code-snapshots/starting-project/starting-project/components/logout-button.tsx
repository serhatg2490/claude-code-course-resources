'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { signOut } from '@/lib/auth-client';

export function LogoutButton(): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function handleClick() {
    setFailed(false);
    startTransition(async () => {
      // Only leave the page once the server has actually revoked the session.
      try {
        const { error } = await signOut();
        if (error) {
          setFailed(true);
          return;
        }
      } catch {
        setFailed(true);
        return;
      }
      router.replace('/authenticate');
      router.refresh();
    });
  }

  return (
    <div className='flex items-center gap-2'>
      {failed && (
        <p role='alert' className='text-sm text-red-600 dark:text-red-400'>
          Logout failed. Try again.
        </p>
      )}
      <button
        type='button'
        onClick={handleClick}
        disabled={pending}
        className='rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900'
      >
        {pending ? 'Logging out…' : 'Log out'}
      </button>
    </div>
  );
}
