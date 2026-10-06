import { describe, expect, it } from 'vitest';

import { parseCredentials } from '@/lib/auth-schemas';

function formData(email: string, password: string): FormData {
  const data = new FormData();
  data.set('email', email);
  data.set('password', password);
  return data;
}

describe('parseCredentials', () => {
  it('accepts a valid email and password', () => {
    expect(parseCredentials(formData('ada@example.com', 'hunter22'))).toEqual({
      data: { email: 'ada@example.com', password: 'hunter22' },
    });
  });

  it('rejects an invalid email', () => {
    expect(parseCredentials(formData('not-an-email', 'hunter22')).errors).toEqual({
      email: 'Enter a valid email address.',
      password: undefined,
    });
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(parseCredentials(formData('ada@example.com', 'short')).errors).toEqual({
      email: undefined,
      password: 'Password must be at least 8 characters.',
    });
  });

  it('reports both fields when the form is empty', () => {
    const { errors } = parseCredentials(new FormData());
    expect(errors?.email).toBeDefined();
    expect(errors?.password).toBeDefined();
  });
});
