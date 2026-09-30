import { createAuthClient } from 'better-auth/react';

/**
 * better-auth client for client components. It calls the `/api/auth/*` route on the same origin, so no
 * `baseURL` is needed: in the browser it falls back to `window.location.origin`.
 * Server code should use `getSession()` / `requireAuth()` from `lib/auth.ts` instead.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

export type ClientSession = typeof authClient.$Infer.Session;
