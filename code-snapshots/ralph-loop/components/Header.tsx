import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { DASHBOARD_PATH, HOME_PATH, SIGN_IN_PATH } from '@/lib/routes';
import { APP_NAME } from '@/lib/site';
import { LogoutButton } from './LogoutButton';

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100';

const SECONDARY_LINK = `rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 ${FOCUS_RING}`;

const PRIMARY_LINK = `rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 ${FOCUS_RING}`;

/** The site-wide header: app name, plus account links that depend on whether the visitor is signed in. */
export async function Header() {
  const session = await getSession();

  return (
    <header className='border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'>
      <div className='mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4'>
        <Link
          href={HOME_PATH}
          className={`rounded-md text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 ${FOCUS_RING}`}
        >
          {APP_NAME}
        </Link>

        {session && (
          <p className='ml-auto hidden max-w-48 truncate text-sm text-zinc-500 sm:block dark:text-zinc-400'>
            {session.user.email}
          </p>
        )}

        <nav aria-label='Account'>
          {session ? (
            <ul className='flex items-center gap-1'>
              <li>
                <Link href={DASHBOARD_PATH} className={SECONDARY_LINK}>
                  Dashboard
                </Link>
              </li>
              <li className='flex items-center gap-2'>
                <LogoutButton />
              </li>
            </ul>
          ) : (
            <ul className='flex items-center gap-1'>
              <li>
                <Link href={SIGN_IN_PATH} className={SECONDARY_LINK}>
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href={{ pathname: SIGN_IN_PATH, query: { mode: 'signup' } }}
                  className={PRIMARY_LINK}
                >
                  Sign up
                </Link>
              </li>
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
}
