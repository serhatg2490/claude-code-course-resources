/** `redirect()` throws in Next; the mock does too so control flow matches production. */
export class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

export function throwRedirect(url: string): never {
  throw new RedirectError(url);
}
