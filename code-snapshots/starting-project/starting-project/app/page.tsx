import Link from 'next/link';

import { getCurrentUser } from '@/lib/auth';

const CTA_CLASS =
  'rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current';

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <main className='mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center'>
      <h1 className='text-4xl font-semibold tracking-tight sm:text-5xl'>NextNotes</h1>
      <p className='max-w-xl text-lg text-neutral-500'>
        Write rich-text notes with headings, lists and code, keep them organized in one place, and
        share any note publicly with a single link.
      </p>
      <div className='flex flex-wrap justify-center gap-3'>
        {user ? (
          <Link href='/dashboard' className={`${CTA_CLASS} bg-foreground text-background`}>
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href='/authenticate?mode=signup'
              className={`${CTA_CLASS} bg-foreground text-background`}
            >
              Get started
            </Link>
            <Link
              href='/authenticate'
              className={`${CTA_CLASS} border border-neutral-300 dark:border-neutral-700`}
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
