import type { Database } from 'bun:sqlite';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';

const DAY_IN_SECONDS = 60 * 60 * 24;

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

export const auth = createAuth(getDb());

export type Session = typeof auth.$Infer.Session;
