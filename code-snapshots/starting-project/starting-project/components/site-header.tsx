import Link from 'next/link';

import { LogoutButton } from '@/components/logout-button';
import { getCurrentUser } from '@/lib/auth';

export async function SiteHeader(): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  return (
    <header className='border-b border-neutral-200 dark:border-neutral-800'>
      <nav
        aria-label='Main'
        className='page-container flex h-14 items-center justify-between gap-4'
      >
        <Link
          href='/dashboard'
          className='rounded-sm text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-link'
        >
          NextNotes
        </Link>

        {user && (
          <div className='flex items-center gap-3'>
            <span className='hidden truncate text-sm text-neutral-500 sm:inline'>{user.email}</span>
            <LogoutButton />
          </div>
        )}
      </nav>
    </header>
  );
}
