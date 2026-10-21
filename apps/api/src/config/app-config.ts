import type { Env } from './env.schema';

/**
 * Typed, grouped view of the environment. Services depend on this class
 * (injected via AppConfigModule) instead of reading process.env directly.
 */
export class AppConfig {
  constructor(private readonly env: Env) {}

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get http() {
    return {
      port: this.env.API_PORT,
      webOrigin: this.env.WEB_ORIGIN,
      clientIpHeader: this.env.CLIENT_IP_HEADER,
      openApiEnabled: this.env.OPENAPI_ENABLED,
      rateLimitPerMinute: this.env.RATE_LIMIT_PER_MINUTE,
    };
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get encryptionKey(): Buffer {
    return Buffer.from(this.env.FIELD_ENCRYPTION_KEY, 'base64');
  }

  get session() {
    return {
      staffIdleSeconds: this.env.SESSION_STAFF_IDLE_MINUTES * 60,
      studentIdleSeconds: this.env.SESSION_STUDENT_IDLE_DAYS * 24 * 60 * 60,
      absoluteSeconds: this.env.SESSION_ABSOLUTE_DAYS * 24 * 60 * 60,
      // Secure cookies need HTTPS; plain-http localhost is the only exception.
      secureCookies: this.env.WEB_ORIGIN.startsWith('https://'),
      // The __Host- prefix forces Secure, Path=/ and no Domain (browser-enforced).
      cookieName: this.isProduction ? '__Host-eta_session' : 'eta_session',
      csrfCookieName: this.isProduction ? '__Host-eta_csrf' : 'eta_csrf',
    };
  }

  get loginProtection() {
    return {
      maxFailures: this.env.LOGIN_MAX_FAILURES,
      lockSeconds: this.env.LOGIN_LOCK_MINUTES * 60,
      captchaAfterFailures: this.env.LOGIN_CAPTCHA_AFTER_FAILURES,
    };
  }

  get tokens() {
    return {
      invitationTtlSeconds: this.env.INVITATION_TTL_HOURS * 60 * 60,
      passwordResetTtlSeconds: this.env.PASSWORD_RESET_TTL_MINUTES * 60,
    };
  }

  /** Illustrative stories (spec §9.10: never in production). */
  get showExampleContent(): boolean {
    return this.env.SHOW_EXAMPLE_CONTENT;
  }

  get totpIssuer(): string {
    return this.env.TOTP_ISSUER;
  }

  get captchaSecret(): string {
    return this.env.TURNSTILE_SECRET_KEY;
  }

  get hibpEnabled(): boolean {
    return this.env.HIBP_ENABLED;
  }

  get payments() {
    return {
      provider: this.env.PAYMENT_PROVIDER,
      testSecret: this.env.PAYMENT_TEST_SECRET ?? '',
    };
  }

  get mail() {
    return {
      host: this.env.SMTP_HOST,
      port: this.env.SMTP_PORT,
      secure: this.env.SMTP_SECURE,
      user: this.env.SMTP_USER,
      password: this.env.SMTP_PASSWORD,
      from: this.env.MAIL_FROM,
    };
  }
}
