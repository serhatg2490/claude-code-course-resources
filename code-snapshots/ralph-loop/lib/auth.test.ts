import type { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { APIError } from 'better-auth/api';
import { createAuth, createSessionHelpers } from './auth';
import { openDb } from './db';
import { SIGN_IN_PATH } from './routes';

/** Thrown by the mocked `redirect()`, so tests can assert on the target without Next.js internals. */
class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`Redirected to ${url}`);
  }
}

// Stand-ins for the Next.js request context: `headers()` returns whatever the test sets here.
let requestHeaders = new Headers();

mock.module('next/headers', () => ({
  headers: async () => requestHeaders,
}));

mock.module('next/navigation', () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

type AccountRow = {
  providerId: string;
  accountId: string;
  userId: string;
  password: string | null;
};

const credentials = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-battery',
};

let db: Database;
let auth: ReturnType<typeof createAuth>;

beforeEach(() => {
  db = openDb(':memory:');
  auth = createAuth(db);
  requestHeaders = new Headers();
});

afterEach(() => {
  db.close();
});

/**
 * Turns the Set-Cookie headers of an auth response into a Cookie request header.
 */
function cookieHeaderFrom(response: Response): Headers {
  const cookie = response.headers
    .getSetCookie()
    .map((setCookie) => setCookie.split(';')[0])
    .join('; ');
  return new Headers({ cookie });
}

describe('sign up', () => {
  test('creates the user and a credential account with a hashed password', async () => {
    const result = await auth.api.signUpEmail({ body: credentials });

    expect(result.user).toMatchObject({
      name: credentials.name,
      email: credentials.email,
      emailVerified: false,
    });
    expect(result.user.createdAt).toBeInstanceOf(Date);

    const account = db
      .query<AccountRow, [string]>(
        'SELECT providerId, accountId, userId, password FROM account WHERE userId = ?',
      )
      .get(result.user.id);
    expect(account).toMatchObject({
      providerId: 'credential',
      accountId: result.user.id,
      userId: result.user.id,
    });
    expect(account?.password).toBeString();
    expect(account?.password).not.toBe(credentials.password);
  });

  test('signs the user in right away (autoSignIn)', async () => {
    const result = await auth.api.signUpEmail({ body: credentials });

    expect(result.token).toBeString();
    expect(db.query('SELECT COUNT(*) AS count FROM session').get()).toEqual({ count: 1 });
  });

  test('rejects a duplicate email', async () => {
    await auth.api.signUpEmail({ body: credentials });

    await expect(
      auth.api.signUpEmail({ body: { ...credentials, name: 'Someone else' } }),
    ).rejects.toBeInstanceOf(APIError);
  });

  test('rejects a password shorter than 8 characters', async () => {
    await expect(
      auth.api.signUpEmail({ body: { ...credentials, password: 'short' } }),
    ).rejects.toBeInstanceOf(APIError);
    expect(db.query('SELECT COUNT(*) AS count FROM user').get()).toEqual({ count: 0 });
  });
});

describe('sign in', () => {
  beforeEach(async () => {
    await auth.api.signUpEmail({ body: credentials });
  });

  test('succeeds with the right password', async () => {
    const result = await auth.api.signInEmail({
      body: { email: credentials.email, password: credentials.password },
    });

    expect(result.user.email).toBe(credentials.email);
    expect(result.token).toBeString();
  });

  test('fails with a wrong password', async () => {
    await expect(
      auth.api.signInEmail({ body: { email: credentials.email, password: 'wrong-password' } }),
    ).rejects.toBeInstanceOf(APIError);
  });

  test('fails for an unknown email', async () => {
    await expect(
      auth.api.signInEmail({
        body: { email: 'nobody@example.com', password: credentials.password },
      }),
    ).rejects.toBeInstanceOf(APIError);
  });
});

describe('sessions', () => {
  test('the session cookie resolves to the signed-in user', async () => {
    await auth.api.signUpEmail({ body: credentials });
    const response = await auth.api.signInEmail({
      body: { email: credentials.email, password: credentials.password },
      asResponse: true,
    });

    const session = await auth.api.getSession({ headers: cookieHeaderFrom(response) });

    expect(session?.user.email).toBe(credentials.email);
    expect(session?.session.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 6 * 24 * 60 * 60 * 1000,
    );
  });

  test('no cookie means no session', async () => {
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
  });

  test('signing out revokes the session', async () => {
    await auth.api.signUpEmail({ body: credentials });
    const response = await auth.api.signInEmail({
      body: { email: credentials.email, password: credentials.password },
      asResponse: true,
    });
    const headers = cookieHeaderFrom(response);

    await auth.api.signOut({ headers });

    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  test('deleting a user cascades to their sessions and accounts', async () => {
    const { user } = await auth.api.signUpEmail({ body: credentials });

    db.query('DELETE FROM user WHERE id = ?').run(user.id);

    expect(db.query('SELECT COUNT(*) AS count FROM session').get()).toEqual({ count: 0 });
    expect(db.query('SELECT COUNT(*) AS count FROM account').get()).toEqual({ count: 0 });
  });
});

describe('session helpers', () => {
  let helpers: ReturnType<typeof createSessionHelpers>;

  beforeEach(() => {
    helpers = createSessionHelpers(auth);
  });

  /** Signs up, then puts the resulting session cookie on the mocked request. */
  async function signInRequest() {
    const response = await auth.api.signUpEmail({ body: credentials, asResponse: true });
    requestHeaders = cookieHeaderFrom(response);
  }

  test('getSession() returns the signed-in user for the request cookie', async () => {
    await signInRequest();

    const session = await helpers.getSession();

    expect(session?.user).toMatchObject({ name: credentials.name, email: credentials.email });
    expect(session?.session.userId).toBe(session?.user.id);
  });

  test('getSession() returns null without a session cookie', async () => {
    expect(await helpers.getSession()).toBeNull();
  });

  test('getSession() returns null for an unknown session token', async () => {
    requestHeaders = new Headers({ cookie: 'better-auth.session_token=forged.token' });

    expect(await helpers.getSession()).toBeNull();
  });

  test('getSession() returns null once the user has signed out', async () => {
    await signInRequest();
    await auth.api.signOut({ headers: requestHeaders });

    expect(await helpers.getSession()).toBeNull();
  });

  test('requireAuth() returns the session when signed in', async () => {
    await signInRequest();

    const session = await helpers.requireAuth();

    expect(session.user.email).toBe(credentials.email);
  });

  test('requireAuth() redirects to the sign-in page when signed out', async () => {
    const error = await helpers.requireAuth().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RedirectError);
    expect(error).toMatchObject({ url: SIGN_IN_PATH });
  });
});
