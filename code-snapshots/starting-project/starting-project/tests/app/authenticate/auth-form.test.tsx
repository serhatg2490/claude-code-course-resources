// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthForm } from '@/app/authenticate/auth-form';
import { authClient } from '@/lib/auth-client';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: vi.fn() }, signUp: { email: vi.fn() } },
}));

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.submit(screen.getByRole('button').closest('form')!);
}

describe('AuthForm', () => {
  it('shows validation errors and focuses the first invalid field', () => {
    render(<AuthForm mode='login' />);
    fillAndSubmit('not-an-email', 'short');

    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
    expect(authClient.signIn.email).not.toHaveBeenCalled();
  });

  it('focuses the password when only it is invalid', () => {
    render(<AuthForm mode='login' />);
    fillAndSubmit('ada@example.com', 'short');
    expect(document.activeElement).toBe(screen.getByLabelText('Password'));
  });

  it('logs in and navigates to the dashboard', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null } as never);
    render(<AuthForm mode='login' />);

    fillAndSubmit('ada@example.com', 'hunter22');

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/dashboard'));
    expect(router.refresh).toHaveBeenCalled();
    expect(authClient.signIn.email).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'hunter22',
    });
  });

  it('signs up with a name derived from the email', async () => {
    vi.mocked(authClient.signUp.email).mockResolvedValue({ data: {}, error: null } as never);
    render(<AuthForm mode='signup' />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();

    fillAndSubmit('ada@example.com', 'hunter22');

    await waitFor(() =>
      expect(authClient.signUp.email).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'hunter22',
        name: 'ada',
      }),
    );
  });

  it('shows a friendly message for API errors', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
    } as never);
    render(<AuthForm mode='login' />);

    fillAndSubmit('ada@example.com', 'hunter22');

    expect((await screen.findByRole('alert')).textContent).toBe(
      "That email and password don't match an account.",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a generic message when the request throws', async () => {
    vi.mocked(authClient.signIn.email).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthForm mode='login' />);

    fillAndSubmit('ada@example.com', 'hunter22');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
