import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm, type AuthMode } from './auth-form';
import { getSession } from '@/lib/auth';

type AuthenticatePageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function AuthenticatePage({ searchParams }: AuthenticatePageProps) {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  const { mode: rawMode } = await searchParams;
  const mode: AuthMode = rawMode === 'signup' ? 'signup' : 'login';
  const isSignUp = mode === 'signup';

  return (
    <main className='flex flex-1 flex-col items-center justify-center gap-8 p-8'>
      <header className='flex flex-col items-center gap-2 text-center'>
        <h1 className='text-4xl font-semibold tracking-tight'>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className='text-neutral-500'>
          {isSignUp
            ? 'Sign up with an email address and password to start writing notes.'
            : 'Sign in with your email address and password.'}
        </p>
      </header>

      <AuthForm key={mode} mode={mode} />

      <p className='text-sm text-neutral-500'>
        {isSignUp ? 'Already have an account? ' : "Don't have an account yet? "}
        <Link href={isSignUp ? '/authenticate' : '/authenticate?mode=signup'} className='underline'>
          {isSignUp ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </main>
  );
}
