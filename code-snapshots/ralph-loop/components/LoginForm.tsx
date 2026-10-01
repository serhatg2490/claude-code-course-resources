'use client';

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';
import { signIn } from '@/lib/auth-client';
import {
  getAuthErrorMessage,
  signInSchema,
  type FieldErrors,
  type SignInValues,
} from '@/lib/auth-validation';
import { focusFirstInvalidField } from '@/lib/forms';
import { FormError } from './FormError';
import { FormField } from './FormField';
import { SubmitButton } from './SubmitButton';

const SIGN_IN_FAILED = 'Could not log you in. Please try again.';

const INITIAL_VALUES: SignInValues = { email: '', password: '' };

type LoginFormProps = {
  /** Called once the user is signed in and the session cookie is set. */
  onSuccess: () => void;
};

/** Email + password login. Validates on submit, then calls better-auth's `signIn.email`. */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignInValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.currentTarget;
    setValues((current) => ({ ...current, [name]: value }));
    // Clear the field's message once the user starts fixing it.
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setFormError(null);

    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors(errors);
      focusFirstInvalidField(form, Object.keys(errors));
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const message = await submitSignIn(parsed.data);
      if (message) {
        // Keep the email, but clear the password so the next attempt starts fresh.
        setValues((current) => ({ ...current, password: '' }));
        setFormError(message);
        return;
      }
      onSuccess();
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <FormField
        label='Email'
        name='email'
        type='email'
        autoComplete='email'
        required
        value={values.email}
        onChange={handleChange}
        error={fieldErrors.email?.[0]}
        disabled={isPending}
      />
      <FormField
        label='Password'
        name='password'
        type='password'
        autoComplete='current-password'
        required
        value={values.password}
        onChange={handleChange}
        error={fieldErrors.password?.[0]}
        disabled={isPending}
      />

      <FormError message={formError} />

      <SubmitButton isPending={isPending} pendingLabel='Logging in…'>
        Log in
      </SubmitButton>
    </form>
  );
}

/** Signs the user in. Returns an error message to show, or `null` on success. */
async function submitSignIn(data: z.output<typeof signInSchema>): Promise<string | null> {
  try {
    const { error } = await signIn.email(data);
    return error ? getAuthErrorMessage(error, SIGN_IN_FAILED) : null;
  } catch {
    // Network failures throw instead of returning `{ error }`.
    return SIGN_IN_FAILED;
  }
}
