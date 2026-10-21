import { execSync } from 'node:child_process';
import path from 'node:path';
import { createPrismaClient } from './prisma-client';
import { applyTestEnv } from './test-env';

/** Creates the test database if needed and applies all migrations to it. */
export default async function globalSetup(): Promise<void> {
  applyTestEnv();
  const testUrl = new URL(process.env['DATABASE_URL']!);
  const testDb = testUrl.pathname.slice(1);

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  const admin = createPrismaClient(adminUrl.toString());
  try {
    const rows = await admin.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${testDb}`;
    // Identifier comes from our own config and is checked to be a plain name.
    if (!/^\w+$/.test(testDb)) throw new Error(`Unexpected test database name: ${testDb}`);
    if (rows.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${testDb}"`);
  } finally {
    await admin.$disconnect();
  }

  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../../../packages/db'),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: 'pipe',
  });
}
