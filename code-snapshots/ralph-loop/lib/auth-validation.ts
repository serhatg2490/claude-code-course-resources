import { z } from 'zod';

/**
 * Client-safe validation for the auth forms. It imports nothing server-only, so client components can use it.
 * The password limits are shared with the better-auth config in `lib/auth.ts`, so both sides agree.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

const MAX_NAME_LENGTH = 100;

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter your name')
  .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`);

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .pipe(z.email('Enter a valid email address'));

// Not trimmed: leading or trailing spaces are part of the password.
const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`);

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export type SignUpValues = z.input<typeof signUpSchema>;

/**
 * Messages per invalid field, in the shape of `z.flattenError(error).fieldErrors`.
 * The forms show the first message under each input.
 */
export type FieldErrors<T> = { [K in keyof T]?: string[] };

/**
 * better-auth's own messages are terse ("User already exists."), so known codes get friendlier copy.
 * A Map rather than an object literal, so codes like "toString" can't resolve to prototype members.
 */
const AUTH_ERROR_MESSAGES = new Map<string, string>([
  ['USER_ALREADY_EXISTS', 'An account with this email already exists. Try logging in instead.'],
  [
    'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    'An account with this email already exists. Try logging in instead.',
  ],
  ['INVALID_EMAIL', 'Enter a valid email address'],
  ['INVALID_EMAIL_OR_PASSWORD', 'Incorrect email or password'],
  ['PASSWORD_TOO_SHORT', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`],
  ['PASSWORD_TOO_LONG', `Password must be at most ${MAX_PASSWORD_LENGTH} characters`],
]);

/** The subset of a better-auth client error the forms read. */
export type AuthClientError = { code?: string; message?: string; status: number };

/** Turns a better-auth client error into a message that is safe and useful to show the user. */
export function getAuthErrorMessage(error: AuthClientError, fallback: string): string {
  const message = error.code ? AUTH_ERROR_MESSAGES.get(error.code) : undefined;
  if (message) {
    return message;
  }
  if (error.status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return fallback;
}
