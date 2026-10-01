/** App paths shared by server and client code. Client-safe: imports nothing. */

/** The public landing page, and where users land after logging out. */
export const HOME_PATH = '/';

/** Where `requireAuth()` sends visitors without a session. */
export const SIGN_IN_PATH = '/authenticate';

/** The signed-in home: where users land after logging in or signing up. */
export const DASHBOARD_PATH = '/dashboard';

/** The editor for one of the signed-in user's notes. */
export function notePath(noteId: string): string {
  return `/notes/${noteId}`;
}

/** The anonymous, read-only page for a shared note. */
export function publicNotePath(slug: string): string {
  return `/p/${slug}`;
}
