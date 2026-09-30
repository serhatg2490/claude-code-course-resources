import type { Database } from 'bun:sqlite';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getDb } from './db';

const DAY_IN_SECONDS = 60 * 60 * 24;

/** Where `requireAuth()` sends visitors without a session. */
export const SIGN_IN_PATH = '/authenticate';

/**
 * Builds a better-auth instance on top of a Bun SQLite connection.
 * better-auth detects `bun:sqlite` and uses its built-in Kysely dialect; the tables come from `lib/schema.ts`.
 * The app uses the `auth` singleton below; tests pass an in-memory database from `openDb(':memory:')`.
 */
export function createAuth(database: Database) {
  return betterAuth({
    database,
    // `secret` and `baseURL` are read from BETTER_AUTH_SECRET / BETTER_AUTH_URL (see .env.example).
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Sign the user in right after sign-up, so the auth page can redirect straight to /dashboard.
      autoSignIn: true,
    },
    session: {
      expiresIn: 7 * DAY_IN_SECONDS,
      // Extend the expiry at most once a day, when the session is used.
      updateAge: DAY_IN_SECONDS,
    },
    // Lets `auth.api.*` calls in server actions set cookies. Must stay the last plugin.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Builds the request-scoped session helpers for server components and server actions.
 * The app uses the `getSession` / `requireAuth` exports below; tests pass an auth instance from `createAuth()`.
 */
export function createSessionHelpers(authInstance: Auth) {
  /**
   * Resolves the current request's session cookie to `{ session, user }`, or `null` when signed out.
   * Wrapped in React `cache` so a layout and page rendering in the same request share one lookup.
   */
  const getSession = cache(async () => authInstance.api.getSession({ headers: await headers() }));

  /**
   * Returns the current session, or redirects to the sign-in page when there is none.
   * Use it at the top of protected pages and in every server action.
   */
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      redirect(SIGN_IN_PATH);
    }
    return session;
  }

  return { getSession, requireAuth };
}

export const auth = createAuth(getDb());

export type Session = typeof auth.$Infer.Session;

export const { getSession, requireAuth } = createSessionHelpers(auth);
