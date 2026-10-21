import { z } from 'zod';

/**
 * Validation rules shared by the web forms and the API.
 * Error messages are translation keys (web: messages/*.json → "errors.<key>"),
 * never English sentences, so every language shows its own text.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, { error: 'email.invalid' })
  .pipe(z.email({ error: 'email.invalid' }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: 'password.tooShort' })
  .max(PASSWORD_MAX_LENGTH, { error: 'password.tooLong' });

/** Sign-in only checks the shape; the strength policy applies when a password is set. */
const loginPasswordSchema = z.string().min(1, { error: 'required' }).max(PASSWORD_MAX_LENGTH);

/** Single-use links carry 32 random bytes encoded as base64url (43 characters). */
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, { error: 'token.invalid' });

export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'totp.invalid' });

const captchaTokenSchema = z.string().max(2048).optional();

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  captchaToken: captchaTokenSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  captchaToken: captchaTokenSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const acceptInvitationSchema = resetPasswordSchema;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const totpVerifySchema = z.object({ code: totpCodeSchema });
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;
