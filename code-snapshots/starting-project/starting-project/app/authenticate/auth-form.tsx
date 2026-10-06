'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { TextField } from './text-field';
import { authClient } from '@/lib/auth-client';
import { messageForAuthError } from '@/lib/auth-errors';
import { parseCredentials } from '@/lib/auth-schemas';

export type AuthMode = 'login' | 'signup';

type AuthFormProps = {
  mode: AuthMode;
};

type FormErrors = {
  email?: string;
  password?: string;
  /** Error not tied to a single field, e.g. wrong credentials. */
  form?: string;
};

/** Moves focus to the first field that failed validation so it is announced. */
function focusField(form: HTMLFormElement, name: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) {
    field.focus();
  }
}

export function AuthForm({ mode }: AuthFormProps): React.JSX.Element {
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  const isSignUp = mode === 'signup';

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const { data, errors: fieldErrors } = parseCredentials(new FormData(form));

    if (fieldErrors) {
      setErrors(fieldErrors);
      focusField(form, fieldErrors.email ? 'email' : 'password');
      return;
    }

    setErrors({});

    const { email, password } = data;
    startTransition(async () => {
      try {
        const { error } = isSignUp
          ? await authClient.signUp.email({
              email,
              password,
              // We only collect email + password; better-auth requires a name.
              name: email.split('@')[0],
            })
          : await authClient.signIn.email({ email, password });

        if (error) {
          setErrors({ form: messageForAuthError(error.code, error.message ?? '') });
          return;
        }
      } catch {
        // Network failures throw instead of returning `error`.
        setErrors({ form: messageForAuthError(undefined, '') });
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className='flex w-full max-w-sm flex-col gap-5'>
      {errors.form && (
        <p
          role='alert'
          className='px-3 py-2 text-sm rounded-md border border-red-500 text-red-600 dark:text-red-400'
        >
          {errors.form}
        </p>
      )}

      <TextField
        name='email'
        label='Email'
        type='email'
        autoComplete='email'
        error={errors.email}
        disabled={isPending}
      />

      <TextField
        name='password'
        label='Password'
        type='password'
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        error={errors.password}
        disabled={isPending}
      />

      <button
        type='submit'
        disabled={isPending}
        className='px-4 py-2 text-sm font-medium rounded-md bg-foreground text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60'
      >
        {isPending ? 'Working…' : isSignUp ? 'Create account' : 'Log in'}
      </button>
    </form>
  );
}
