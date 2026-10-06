import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { getDb } from '@/lib/db';

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET must be set to at least 32 characters (openssl rand -base64 32).',
  );
}

export const auth = betterAuth({
  // getDb() has already created the tables better-auth expects.
  database: getDb(),
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

/** Session for the incoming request, or null when signed out. Deduped per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/** Use in protected server components: redirects instead of returning null. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/authenticate');
  return user;
}
