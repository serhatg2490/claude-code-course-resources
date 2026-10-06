import { z } from 'zod';

/** Mirrors `emailAndPassword.minPasswordLength` in lib/auth.ts. */
export const credentialsSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export type CredentialsErrors = { email?: string; password?: string };

/** Validates the auth form; returns either the parsed credentials or field errors. */
export function parseCredentials(
  formData: FormData,
): { data: Credentials; errors?: never } | { data?: never; errors: CredentialsErrors } {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (parsed.success) return { data: parsed.data };

  const { fieldErrors } = z.flattenError(parsed.error);
  return { errors: { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] } };
}
