import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { z } from 'zod';
import { LOCALES } from '../locales';
import { personNameSchema } from './user';

/** Israeli (050-123-4567) or international (+44 …) numbers, stored as E.164 (+972501234567). */
export const phoneSchema = z
  .string()
  .trim()
  .max(32, { error: 'phone.invalid' })
  .transform((value, context) => {
    const phone = parsePhoneNumberFromString(value, 'IL');
    if (!phone?.isValid()) {
      context.addIssue({ code: 'custom', message: 'phone.invalid' });
      return z.NEVER;
    }
    return phone.number;
  });

export const CALL_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type CallDay = (typeof CALL_DAYS)[number];

/** Spec §3.6: Morning 09–12 · Midday 12–15 · Afternoon 15–18 · Evening 18–21. */
export const CALL_HOURS = {
  morning: '09:00–12:00',
  midday: '12:00–15:00',
  afternoon: '15:00–18:00',
  evening: '18:00–21:00',
} as const;
export type CallHours = keyof typeof CALL_HOURS;
const CALL_HOUR_KEYS = Object.keys(CALL_HOURS) as [CallHours, ...CallHours[]];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: 'text.tooLong' })
    .optional()
    .transform((value) => value || undefined);

/** Enroll — book a call (spec §3.6). Same rules in the browser and on the server. */
export const enrollSchema = z.object({
  programSlug: z.string().min(1, { error: 'program.required' }).max(80),
  /** Optional cohort chosen on the course page; checked against the program on the server. */
  cohortId: z.uuid().optional(),
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: phoneSchema,
  occupation: optionalText(100),
  days: z
    .array(z.enum(CALL_DAYS))
    .min(1, { error: 'days.required' })
    .transform((days) => [...new Set(days)]),
  hours: z
    .array(z.enum(CALL_HOUR_KEYS))
    .min(1, { error: 'hours.required' })
    .transform((hours) => [...new Set(hours)]),
  notes: optionalText(500),
  /** The visitor ticked the consent box (spec §3.6: required). */
  consent: z.literal(true, { error: 'consent.required' }),
  locale: z.enum(LOCALES),
  captchaToken: z.string().max(2048).optional(),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(200).optional(),
});
export type EnrollInput = z.infer<typeof enrollSchema>;
