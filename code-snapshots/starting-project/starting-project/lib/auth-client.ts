'use client';

import { createAuthClient } from 'better-auth/react';

/** Same-origin client: talks to /api/auth/*. */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
