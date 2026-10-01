/** App paths shared by server and client code. Client-safe: imports nothing. */

/** Where `requireAuth()` sends visitors without a session. */
export const SIGN_IN_PATH = '/authenticate';

/** The signed-in home: where users land after logging in or signing up. */
export const DASHBOARD_PATH = '/dashboard';
