import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { getSession } from '@/lib/auth';
import { authModeSchema, type AuthMode } from '@/lib/auth-validation';
import { DASHBOARD_PATH, SIGN_IN_PATH } from '@/lib/routes';

export const metadata: Metadata = {
  title: 'Log in or sign up',
};

const COPY: Record<AuthMode, { heading: string; description: string }> = {
  login: {
    heading: 'Welcome back',
    description: 'Log in to get to your notes.',
  },
  signup: {
    heading: 'Create your account',
    description: 'Sign up to start writing and sharing notes.',
  },
};

const MODE_LINKS: { mode: AuthMode; label: string }[] = [
  { mode: 'login', label: 'Log in' },
  { mode: 'signup', label: 'Sign up' },
];

/** Login and sign-up in one page. `?mode=signup` opens the sign-up form; anything else opens login. */
export default async function AuthenticatePage({ searchParams }: PageProps<'/authenticate'>) {
  if (await getSession()) {
    redirect(DASHBOARD_PATH);
  }

  const mode = authModeSchema.parse((await searchParams).mode);
  const { heading, description } = COPY[mode];

  return (
    <main className='mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16'>
      <div className='flex flex-col gap-2 text-center'>
        <h1 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100'>
          {heading}
        </h1>
        <p className='text-zinc-600 dark:text-zinc-400'>{description}</p>
      </div>

      <div className='flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950'>
        <nav aria-label='Log in or sign up'>
          <ul className='grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900'>
            {MODE_LINKS.map((link) => (
              <li key={link.mode}>
                <Link
                  href={{ pathname: SIGN_IN_PATH, query: { mode: link.mode } }}
                  replace
                  scroll={false}
                  aria-current={link.mode === mode ? 'page' : undefined}
                  className='block rounded-md px-3 py-1.5 text-center text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 aria-[current=page]:bg-white aria-[current=page]:text-zinc-900 aria-[current=page]:shadow-xs dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-zinc-100 dark:aria-[current=page]:bg-zinc-800 dark:aria-[current=page]:text-zinc-100'
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <AuthForm mode={mode} />
      </div>
    </main>
  );
}
