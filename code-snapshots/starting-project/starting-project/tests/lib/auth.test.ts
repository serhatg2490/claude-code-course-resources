import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RedirectError, throwRedirect } from '../helpers/next-navigation';

const getSession = vi.fn();

vi.mock('better-auth', () => ({ betterAuth: () => ({ api: { getSession } }) }));
vi.mock('better-auth/next-js', () => ({ nextCookies: () => ({}) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({ redirect: throwRedirect }));
vi.mock('@/lib/db', () => ({ getDb: () => ({}) }));

const VALID_SECRET = 'x'.repeat(32);

/** lib/auth validates the secret at import time, so each test gets a fresh module. */
async function importAuth() {
  vi.resetModules();
  return import('@/lib/auth');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('BETTER_AUTH_SECRET validation', () => {
  it.each([
    ['missing', ''],
    ['too short', 'x'.repeat(31)],
  ])('throws when the secret is %s', async (_label, secret) => {
    vi.stubEnv('BETTER_AUTH_SECRET', secret);
    await expect(importAuth()).rejects.toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe('session helpers', () => {
  const user = { id: 'user-1', email: 'ada@example.com' };

  beforeEach(() => {
    vi.stubEnv('BETTER_AUTH_SECRET', VALID_SECRET);
  });

  it('getCurrentUser returns the session user', async () => {
    getSession.mockResolvedValue({ user, session: {} });
    const { getCurrentUser } = await importAuth();
    expect(await getCurrentUser()).toEqual(user);
  });

  it('getCurrentUser returns null when signed out', async () => {
    getSession.mockResolvedValue(null);
    const { getCurrentUser } = await importAuth();
    expect(await getCurrentUser()).toBeNull();
  });

  it('requireUser returns the user when signed in', async () => {
    getSession.mockResolvedValue({ user, session: {} });
    const { requireUser } = await importAuth();
    expect(await requireUser()).toEqual(user);
  });

  it('requireUser redirects to /authenticate when signed out', async () => {
    getSession.mockResolvedValue(null);
    const { requireUser } = await importAuth();
    await expect(requireUser()).rejects.toEqual(new RedirectError('/authenticate'));
  });
});
