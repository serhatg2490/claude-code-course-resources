import { useId, type ComponentProps } from 'react';

type FormFieldProps = Omit<ComponentProps<'input'>, 'id' | 'aria-invalid' | 'aria-describedby'> & {
  label: string;
  /** Always-visible help text under the input, e.g. password rules. */
  hint?: string;
  /** Validation message. When set, the input is marked invalid and announces it. */
  error?: string;
};

/** A labelled text input with optional hint and error text, both linked to the input for screen readers. */
export function FormField({ label, hint, error, ...inputProps }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className='flex flex-col gap-1.5'>
      <label htmlFor={id} className='text-sm font-medium text-zinc-900 dark:text-zinc-100'>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className='rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-xs outline-none placeholder:text-zinc-400 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400/40 disabled:opacity-60 aria-invalid:border-red-600 aria-invalid:focus-visible:ring-red-600/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:aria-invalid:border-red-400'
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className='text-sm text-zinc-600 dark:text-zinc-400'>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className='text-sm text-red-700 dark:text-red-400'>
          {error}
        </p>
      )}
    </div>
  );
}
