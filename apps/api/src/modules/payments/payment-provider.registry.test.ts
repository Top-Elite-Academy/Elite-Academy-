import { describe, expect, it } from 'vitest';
import { ApiException } from '../../common/errors/api.exception';
import type { AppConfig } from '../../config/app-config';
import { envSchema } from '../../config/env.schema';
import { PAYMENTS_DISABLED, PaymentProviderRegistry } from './payment-provider.registry';
import type { TestPaymentProvider } from './test-payment.provider';

const testProvider = { name: 'test' } as TestPaymentProvider;

function registry(provider: string): PaymentProviderRegistry {
  const config = { payments: { provider } } as unknown as AppConfig;
  return new PaymentProviderRegistry(config, testProvider);
}

const productionEnv = {
  NODE_ENV: 'production',
  WEB_ORIGIN: 'https://academy.example.com',
  DATABASE_URL: 'postgresql://u:p@db:5432/eta',
  REDIS_URL: 'redis://redis:6379',
  FIELD_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
  TURNSTILE_SECRET_KEY: 'secret',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  MAIL_FROM: 'Academy <no-reply@example.com>',
  STORAGE_BUCKET: 'files',
  STORAGE_ACCESS_KEY_ID: 'key',
  STORAGE_SECRET_ACCESS_KEY: 'secret-key',
  VIDEO_PROVIDER: 'cloudflare',
  CLOUDFLARE_ACCOUNT_ID: 'account',
  CLOUDFLARE_STREAM_API_TOKEN: 'token',
  CLOUDFLARE_STREAM_CUSTOMER_CODE: 'customer-abc',
};

describe('PaymentProviderRegistry', () => {
  it('returns the configured provider', () => {
    expect(registry('test').current()).toBe(testProvider);
  });

  it('refuses new payments when payments are disabled', () => {
    const attempt = () => registry(PAYMENTS_DISABLED).current();
    expect(attempt).toThrow(ApiException);
    expect(attempt).toThrow('booking.paymentsUnavailable');
  });

  it('has no webhook endpoint when payments are disabled', () => {
    expect(() => registry(PAYMENTS_DISABLED).get('test')).toThrow('notFound');
  });
});

describe('PAYMENT_PROVIDER in production', () => {
  it('accepts "disabled"', () => {
    expect(
      envSchema.safeParse({ ...productionEnv, PAYMENT_PROVIDER: PAYMENTS_DISABLED }).success,
    ).toBe(true);
  });

  it('still refuses the test provider', () => {
    const result = envSchema.safeParse({
      ...productionEnv,
      PAYMENT_PROVIDER: 'test',
      PAYMENT_TEST_SECRET: 'x'.repeat(32),
    });
    expect(result.success).toBe(false);
  });
});
