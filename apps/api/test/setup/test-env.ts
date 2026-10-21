import path from 'node:path';
import { config } from 'dotenv';

/**
 * Integration tests use the same Docker services as development, but a
 * separate database ("<name>_test") and Redis db 1, so dev data is never touched.
 */
export function applyTestEnv(): void {
  config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

  const database = new URL(requireEnv('DATABASE_URL'));
  if (!database.pathname.endsWith('_test')) database.pathname += '_test';
  const redis = new URL(requireEnv('REDIS_URL'));
  redis.pathname = '/1';

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: database.toString(),
    REDIS_URL: redis.toString(),
    WEB_ORIGIN: 'http://localhost:3000',
    HIBP_ENABLED: 'false',
    OPENAPI_ENABLED: 'false',
    SHOW_EXAMPLE_CONTENT: 'false',
    PAYMENT_PROVIDER: 'test',
    PAYMENT_TEST_SECRET: 'test-secret-for-integration-tests-0123456789',
  });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing — copy .env.example to .env`);
  return value;
}
