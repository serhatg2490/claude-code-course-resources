'use client';

import { useRouter } from 'next/navigation';
import type { AuthMode } from '@/lib/auth-validation';
import { DASHBOARD_PATH } from '@/lib/routes';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';

type AuthFormProps = {
  mode: AuthMode;
};

/** The login or sign-up form for `/authenticate`. Either one sends the user to the dashboard once they're signed in. */
export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();

  function handleSuccess() {
    // `replace` so Back doesn't return to a sign-in page the user no longer needs.
    router.replace(DASHBOARD_PATH);
    // Drop cached server components rendered while signed out, so they pick up the new session cookie.
    router.refresh();
  }

  return mode === 'signup' ? (
    <SignUpForm onSuccess={handleSuccess} />
  ) : (
    <LoginForm onSuccess={handleSuccess} />
  );
}
