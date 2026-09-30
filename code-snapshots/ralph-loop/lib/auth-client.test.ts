import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createAuth } from './auth';
import { authClient, signIn, signOut, signUp, useSession } from './auth-client';
import { openDb } from './db';

const credentials = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-battery',
};

let db: Database;
let fetchOptions: {
  customFetchImpl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

beforeEach(() => {
  db = openDb(':memory:');
  const auth = createAuth(db);
  // Serve the client's requests from an in-memory better-auth instance instead of the network.
  fetchOptions = { customFetchImpl: (input, init) => auth.handler(new Request(input, init)) };
});

afterEach(() => {
  db.close();
});

describe('exports', () => {
  test('exposes the auth methods and the session hook', () => {
    expect(signIn.email).toBeFunction();
    expect(signUp.email).toBeFunction();
    expect(signOut).toBeFunction();
    expect(useSession).toBeFunction();
    expect(authClient.getSession).toBeFunction();
  });
});

describe('against the auth route', () => {
  test('signUp.email creates the user', async () => {
    const { data, error } = await signUp.email({ ...credentials, fetchOptions });

    expect(error).toBeNull();
    expect(data?.user).toMatchObject({ name: credentials.name, email: credentials.email });
    expect(db.query('SELECT email FROM user').all()).toEqual([{ email: credentials.email }]);
  });

  test('signUp.email reports a password that is too short', async () => {
    const { data, error } = await signUp.email({ ...credentials, password: 'short', fetchOptions });

    expect(data).toBeNull();
    expect(error?.code).toBe('PASSWORD_TOO_SHORT');
  });

  test('signIn.email signs in with the right password', async () => {
    await signUp.email({ ...credentials, fetchOptions });

    const { data, error } = await signIn.email({
      email: credentials.email,
      password: credentials.password,
      fetchOptions,
    });

    expect(error).toBeNull();
    expect(data?.user.email).toBe(credentials.email);
  });

  test('signIn.email reports invalid credentials', async () => {
    await signUp.email({ ...credentials, fetchOptions });

    const { data, error } = await signIn.email({
      email: credentials.email,
      password: 'wrong-password',
      fetchOptions,
    });

    expect(data).toBeNull();
    expect(error?.status).toBe(401);
    expect(error?.code).toBe('INVALID_EMAIL_OR_PASSWORD');
  });

  test('getSession returns null without a session cookie', async () => {
    const { data, error } = await authClient.getSession({ fetchOptions });

    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
