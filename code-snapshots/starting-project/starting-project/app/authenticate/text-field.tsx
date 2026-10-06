type TextFieldProps = {
  name: string;
  label: string;
  type: 'email' | 'password';
  autoComplete: string;
  error?: string;
  disabled?: boolean;
};

/** Label + input + accessible error message, wired together by id. */
export function TextField({
  name,
  label,
  type,
  autoComplete,
  error,
  disabled,
}: TextFieldProps): React.JSX.Element {
  const errorId = `${name}-error`;

  return (
    <div className='flex flex-col gap-1.5'>
      <label htmlFor={name} className='text-sm font-medium'>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className='w-full px-3 py-2 text-base rounded-md border border-neutral-300 dark:border-neutral-700 aria-invalid:border-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60'
      />
      {error && (
        <p id={errorId} className='text-sm text-red-600 dark:text-red-400'>
          {error}
        </p>
      )}
    </div>
  );
}
