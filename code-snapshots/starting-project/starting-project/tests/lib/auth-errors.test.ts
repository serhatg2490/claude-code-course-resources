import { describe, expect, it } from 'vitest';

import { messageForAuthError } from '@/lib/auth-errors';

describe('messageForAuthError', () => {
  it.each([
    ['INVALID_EMAIL_OR_PASSWORD', "That email and password don't match an account."],
    ['USER_ALREADY_EXISTS', 'An account with that email already exists. Log in instead.'],
    [
      'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      'An account with that email already exists. Log in instead.',
    ],
    ['PASSWORD_TOO_SHORT', 'Password must be at least 8 characters.'],
  ])('maps %s to friendly copy', (code, message) => {
    expect(messageForAuthError(code, 'server message')).toBe(message);
  });

  it('uses the fallback for unknown codes', () => {
    expect(messageForAuthError('RATE_LIMITED', 'Too many requests')).toBe('Too many requests');
  });

  it('uses a generic message when there is no fallback', () => {
    expect(messageForAuthError(undefined, '')).toBe('Something went wrong. Please try again.');
  });
});
