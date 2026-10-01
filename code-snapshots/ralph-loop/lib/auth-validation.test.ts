import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  signInSchema,
  signUpSchema,
} from './auth-validation';

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'correct-horse' };

function fieldErrorsFor(input: unknown) {
  const parsed = signUpSchema.safeParse(input);
  expect(parsed.success).toBe(false);
  return parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
}

describe('signUpSchema', () => {
  test('accepts valid input and trims name and email', () => {
    const parsed = signUpSchema.parse({
      ...valid,
      name: '  Ada Lovelace ',
      email: ' ada@example.com  ',
    });

    expect(parsed).toEqual(valid);
  });

  test('keeps spaces in the password', () => {
    expect(signUpSchema.parse({ ...valid, password: ' spaced out ' }).password).toBe(
      ' spaced out ',
    );
  });

  test('requires every field', () => {
    expect(fieldErrorsFor({ name: ' ', email: '', password: '' })).toEqual({
      name: ['Enter your name'],
      email: ['Enter your email'],
      password: [`Password must be at least ${MIN_PASSWORD_LENGTH} characters`],
    });
  });

  test('rejects a malformed email', () => {
    expect(fieldErrorsFor({ ...valid, email: 'ada@' }).email).toEqual([
      'Enter a valid email address',
    ]);
  });

  test('enforces the password length limits', () => {
    const tooShort = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
    const tooLong = 'a'.repeat(MAX_PASSWORD_LENGTH + 1);

    expect(fieldErrorsFor({ ...valid, password: tooShort }).password).toHaveLength(1);
    expect(fieldErrorsFor({ ...valid, password: tooLong }).password).toEqual([
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
    ]);
    expect(
      signUpSchema.safeParse({ ...valid, password: 'a'.repeat(MIN_PASSWORD_LENGTH) }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ ...valid, password: 'a'.repeat(MAX_PASSWORD_LENGTH) }).success,
    ).toBe(true);
  });

  test('rejects an overly long name', () => {
    expect(fieldErrorsFor({ ...valid, name: 'a'.repeat(101) }).name).toHaveLength(1);
  });
});

describe('signInSchema', () => {
  const credentials = { email: 'ada@example.com', password: 'correct-horse' };

  function signInErrorsFor(input: unknown) {
    const parsed = signInSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    return parsed.success ? {} : z.flattenError(parsed.error).fieldErrors;
  }

  test('accepts valid input, trims the email and keeps spaces in the password', () => {
    expect(signInSchema.parse({ email: ' ada@example.com ', password: ' spaced ' })).toEqual({
      email: 'ada@example.com',
      password: ' spaced ',
    });
  });

  test('requires both fields', () => {
    expect(signInErrorsFor({ email: ' ', password: '' })).toEqual({
      email: ['Enter your email'],
      password: ['Enter your password'],
    });
  });

  test('rejects a malformed email', () => {
    expect(signInErrorsFor({ ...credentials, email: 'ada' }).email).toEqual([
      'Enter a valid email address',
    ]);
  });

  test('does not apply the sign-up password length rules', () => {
    expect(signInSchema.safeParse({ ...credentials, password: 'short' }).success).toBe(true);
  });
});

describe('getAuthErrorMessage', () => {
  const fallback = 'Something went wrong';

  test('maps known better-auth codes to friendly copy', () => {
    expect(
      getAuthErrorMessage({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', status: 422 }, fallback),
    ).toBe('An account with this email already exists. Try logging in instead.');
    expect(getAuthErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 }, fallback)).toBe(
      'Incorrect email or password',
    );
  });

  test('explains rate limiting', () => {
    expect(getAuthErrorMessage({ status: 429 }, fallback)).toBe(
      'Too many attempts. Please wait a moment and try again.',
    );
  });

  test('falls back for unknown codes instead of echoing server text', () => {
    expect(
      getAuthErrorMessage(
        { code: 'SOMETHING_ELSE', message: 'internal detail', status: 500 },
        fallback,
      ),
    ).toBe(fallback);
    expect(getAuthErrorMessage({ code: 'toString', status: 400 }, fallback)).toBe(fallback);
  });
});

test('the better-auth config uses the same password limits', async () => {
  const { createAuth } = await import('./auth');
  const { openDb } = await import('./db');
  const db = openDb(':memory:');
  const auth = createAuth(db);

  expect(auth.options.emailAndPassword?.minPasswordLength).toBe(MIN_PASSWORD_LENGTH);
  expect(auth.options.emailAndPassword?.maxPasswordLength).toBe(MAX_PASSWORD_LENGTH);
  db.close();
});
