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
    SHOW_EXAMPLE_CONTENT: bool.default(false),

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

    /** Gateway adapter name; more are added when the gateway is chosen (spec §12). */
    PAYMENT_PROVIDER: z
      .enum(['test'])
      .default('test')
      .transform((name): string => name),
    /** HMAC secret of the built-in test provider (signs its webhooks). */
    PAYMENT_TEST_SECRET: z.string().min(32).optional(),

    /** Times a student may move one booked session (0 = never). */
    SESSION_MAX_RESCHEDULES: z.coerce.number().int().min(0).default(1),

    /** S3-compatible storage for lesson files and local videos. Endpoint omitted for AWS S3. */
    STORAGE_ENDPOINT: z.url().optional(),
    /** The address browsers use for signed links (defaults to STORAGE_ENDPOINT). */
    STORAGE_PUBLIC_ENDPOINT: z.url().optional(),
    STORAGE_REGION: z.string().min(1).default('us-east-1'),
    STORAGE_BUCKET: z.string().min(3),
    STORAGE_ACCESS_KEY_ID: z.string().min(3),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(8),
    STORAGE_FORCE_PATH_STYLE: bool.default(false),
    STORAGE_CREATE_BUCKET: bool.default(false),

    CLAMAV_HOST: z.string().min(1).default('127.0.0.1'),
    CLAMAV_PORT: positiveInt.default(3310),

    VIDEO_PROVIDER: z.enum(['local', 'cloudflare']).default('local'),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_STREAM_API_TOKEN: z.string().optional(),
    CLOUDFLARE_STREAM_CUSTOMER_CODE: z.string().optional(),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.WEB_ORIGIN.startsWith('https://'), {
    message: 'must use https:// in production',
    path: ['WEB_ORIGIN'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.PAYMENT_PROVIDER !== 'test', {
    message: 'the test payment provider must never be used in production',
    path: ['PAYMENT_PROVIDER'],
  })
  .refine((env) => env.PAYMENT_PROVIDER !== 'test' || Boolean(env.PAYMENT_TEST_SECRET), {
    message: 'set PAYMENT_TEST_SECRET (32+ random characters) for the test provider',
    path: ['PAYMENT_TEST_SECRET'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || !env.SHOW_EXAMPLE_CONTENT, {
    message: 'illustrative example content must never be shown in production',
    path: ['SHOW_EXAMPLE_CONTENT'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || !env.STORAGE_CREATE_BUCKET, {
    message: 'create the production bucket yourself (private, with lifecycle rules)',
    path: ['STORAGE_CREATE_BUCKET'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.VIDEO_PROVIDER !== 'local', {
    message: 'local videos are for development; use cloudflare in production',
    path: ['VIDEO_PROVIDER'],
  })
  .refine(
    (env) =>
      env.VIDEO_PROVIDER !== 'cloudflare' ||
      Boolean(
        env.CLOUDFLARE_ACCOUNT_ID &&
        env.CLOUDFLARE_STREAM_API_TOKEN &&
        env.CLOUDFLARE_STREAM_CUSTOMER_CODE,
      ),
    {
      message:
        'set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN and CLOUDFLARE_STREAM_CUSTOMER_CODE',
      path: ['VIDEO_PROVIDER'],
    },
  );

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
