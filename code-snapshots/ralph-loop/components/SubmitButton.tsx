import type { ReactNode } from 'react';

type SubmitButtonProps = {
  isPending: boolean;
  /** Label shown while the form is submitting, e.g. "Logging in…". */
  pendingLabel: string;
  children: ReactNode;
};

/** The primary submit button for a form. It is disabled and relabelled while the submission is in flight. */
export function SubmitButton({ isPending, pendingLabel, children }: SubmitButtonProps) {
  return (
    <button
      type='submit'
      disabled={isPending}
      className='rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100'
    >
      {isPending ? pendingLabel : children}
    </button>
  );
}
