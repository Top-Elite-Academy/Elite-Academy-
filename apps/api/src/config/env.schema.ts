import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((value) => value === 'true');
const positiveInt = z.coerce.number().int().positive();

/** 32 random bytes, base64-encoded (AES-256 key). */
const encryptionKey = z.string().refine((value) => Buffer.from(value, 'base64').length === 32, {
  message: 'must be 32 random bytes encoded as base64 (see .env.example)',
});

/** Every variable the API reads. Documented in /.env.example. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    WEB_ORIGIN: z.url(),
    API_PORT: positiveInt.default(4000),
    CLIENT_IP_HEADER: z
      .string()
      .regex(/^[A-Za-z0-9-]+$/)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    OPENAPI_ENABLED: bool.default(false),

    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),

    FIELD_ENCRYPTION_KEY: encryptionKey,

    SESSION_STAFF_IDLE_MINUTES: positiveInt.default(30),
    SESSION_STUDENT_IDLE_DAYS: positiveInt.default(7),
    SESSION_ABSOLUTE_DAYS: positiveInt.default(30),

    LOGIN_MAX_FAILURES: positiveInt.default(5),
    LOGIN_LOCK_MINUTES: positiveInt.default(15),
    LOGIN_CAPTCHA_AFTER_FAILURES: positiveInt.default(3),
    RATE_LIMIT_PER_MINUTE: positiveInt.default(100),

    INVITATION_TTL_HOURS: positiveInt.default(72),
    PASSWORD_RESET_TTL_MINUTES: positiveInt.default(30),

    TOTP_ISSUER: z.string().min(1).default('Elite Tech Academy'),

    TURNSTILE_SECRET_KEY: z.string().min(1),
    HIBP_ENABLED: bool.default(true),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: positiveInt,
    SMTP_SECURE: bool.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().min(3),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.WEB_ORIGIN.startsWith('https://'), {
    message: 'must use https:// in production',
    path: ['WEB_ORIGIN'],
  });

export type Env = z.infer<typeof envSchema>;

/** Parses process.env; throws one readable error listing every problem. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
