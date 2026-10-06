/** Friendlier copy for the better-auth error codes the auth form can actually hit. */
export function messageForAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return "That email and password don't match an account.";
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'An account with that email already exists. Log in instead.';
    case 'PASSWORD_TOO_SHORT':
      return 'Password must be at least 8 characters.';
    default:
      return fallback || 'Something went wrong. Please try again.';
  }
}
