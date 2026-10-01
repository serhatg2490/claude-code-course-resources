type FormErrorProps = {
  message: string | null;
};

/** A form-level error (e.g. a failed request), announced to screen readers as soon as it appears. */
export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      role='alert'
      className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
    >
      {message}
    </p>
  );
}
