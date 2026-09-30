/**
 * What every server action returns: the data on success, or a message that is safe to show the user.
 * Expected failures (invalid input, missing note, database errors) come back as `{ success: false }` rather
 * than being thrown, so client components can branch on `success` without a try/catch.
 * Unauthenticated calls are the exception: `requireAuth()` redirects to the sign-in page.
 */
export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
