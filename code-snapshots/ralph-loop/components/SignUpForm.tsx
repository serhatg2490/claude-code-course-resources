'use client';

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';
import { signUp } from '@/lib/auth-client';
import {
  MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  signUpSchema,
  type FieldErrors,
  type SignUpValues,
} from '@/lib/auth-validation';
import { FormField } from './FormField';

const SIGN_UP_FAILED = 'Could not create your account. Please try again.';

const INITIAL_VALUES: SignUpValues = { name: '', email: '', password: '' };

type SignUpFormProps = {
  /** Called once the account exists and the user is signed in (better-auth signs in on sign-up). */
  onSuccess: () => void;
};

/** Email + password registration. Validates on submit, then calls better-auth's `signUp.email`. */
export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignUpValues>>({});
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

    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors(errors);
      focusFirstInvalidField(form, Object.keys(errors));
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      const message = await submitSignUp(parsed.data);
      if (message) {
        setFormError(message);
        return;
      }
      onSuccess();
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <FormField
        label='Name'
        name='name'
        type='text'
        autoComplete='name'
        required
        value={values.name}
        onChange={handleChange}
        error={fieldErrors.name?.[0]}
        disabled={isPending}
      />
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
        autoComplete='new-password'
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={values.password}
        onChange={handleChange}
        error={fieldErrors.password?.[0]}
        disabled={isPending}
      />

      {formError && (
        <p
          role='alert'
          className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
        >
          {formError}
        </p>
      )}

      <button
        type='submit'
        disabled={isPending}
        className='rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100'
      >
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

/** Creates the account. Returns an error message to show, or `null` on success. */
async function submitSignUp(data: z.output<typeof signUpSchema>): Promise<string | null> {
  try {
    const { error } = await signUp.email(data);
    return error ? getAuthErrorMessage(error, SIGN_UP_FAILED) : null;
  } catch {
    // Network failures throw instead of returning `{ error }`.
    return SIGN_UP_FAILED;
  }
}

/** Moves focus to the first invalid input (in DOM order), so keyboard and screen reader users land on it. */
function focusFirstInvalidField(form: HTMLFormElement, invalidNames: string[]) {
  for (const element of form.elements) {
    if (element instanceof HTMLInputElement && invalidNames.includes(element.name)) {
      element.focus();
      return;
    }
  }
}
