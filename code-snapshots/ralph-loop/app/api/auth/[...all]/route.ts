import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// better-auth serves all of its endpoints (sign-up, sign-in, sign-out, get-session, ...) under /api/auth/*.
// This is the app's only API route: note mutations go through server actions.
export const { GET, POST } = toNextJsHandler(auth);
