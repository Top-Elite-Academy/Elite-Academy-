import { z } from 'zod';
import { LOCALES } from '../locales';
import { ROLES } from '../roles';
import { emailSchema, passwordSchema } from './auth';

/** Names: 2–50 characters, letters from Latin, Arabic or Hebrew scripts, spaces, ' and - (spec §3.6). */
export const personNameSchema = z
  .string()
  .trim()
  .min(2, { error: 'name.tooShort' })
  .max(50, { error: 'name.tooLong' })
  .regex(
    /^[\p{Script=Latin}\p{Script=Arabic}\p{Script=Hebrew}][\p{Script=Latin}\p{Script=Arabic}\p{Script=Hebrew}\p{M} '-]*$/u,
    {
      error: 'name.invalid',
    },
  );

/** IANA time-zone name, e.g. "Asia/Jerusalem". */
export const timeZoneSchema = z
  .string()
  .max(64)
  .refine(
    (zone) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    },
    { error: 'timeZone.invalid' },
  );

/** Staff invite a person (spec §4: accounts are created by staff, not by public sign-up). */
export const createInvitationSchema = z.object({
  email: emailSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  roles: z
    .array(z.enum(ROLES))
    .min(1, { error: 'roles.required' })
    .transform((roles) => [...new Set(roles)]),
  locale: z.enum(LOCALES).default('en'),
});
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

/**
 * The only fields a user may change on their own account. `.strict()` rejects
 * anything else (e.g. `roles`, `status`) — protection against mass assignment.
 */
export const updateMyPreferencesSchema = z
  .object({
    locale: z.enum(LOCALES).optional(),
    timeZone: timeZoneSchema.optional(),
  })
  .strict();
export type UpdateMyPreferencesInput = z.infer<typeof updateMyPreferencesSchema>;

/** Student account created during booking (spec §3.7: sign-in or account creation before paying). */
export const signupSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
  locale: z.enum(LOCALES),
  captchaToken: z.string().max(2048).optional(),
});
export type SignupInput = z.infer<typeof signupSchema>;
