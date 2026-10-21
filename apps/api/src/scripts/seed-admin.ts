import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { passwordSchema } from '@eta/shared';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigModule } from '../config/app-config.module';
import { loadEnvFile } from '../config/load-env';
import { AuditModule } from '../modules/audit/audit.module';
import { AuditService } from '../modules/audit/audit.service';
import { BreachedPasswordService } from '../modules/auth/services/breached-password.service';
import { PasswordService } from '../modules/auth/services/password.service';

@Module({
  imports: [AppConfigModule, CommonModule, AuditModule],
  providers: [PasswordService, BreachedPasswordService],
})
class SeedModule {}

/**
 * Creates the first admin from SEED_ADMIN_* variables. Safe to run twice:
 * an existing account is left untouched. Staff 2FA is set up at first sign-in.
 */
async function seedAdmin(): Promise<void> {
  loadEnvFile();
  const email = process.env['SEED_ADMIN_EMAIL']?.trim().toLowerCase();
  const password = passwordSchema.safeParse(process.env['SEED_ADMIN_PASSWORD'] ?? '');
  if (!email || !password.success) {
    throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 10 characters) in .env');
  }

  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    if (await prisma.user.findUnique({ where: { email } })) {
      report(`Admin ${email} already exists — nothing to do.`);
      return;
    }
    const passwords = app.get(PasswordService);
    await passwords.assertAcceptable(password.data);
    const user = await prisma.user.create({
      data: {
        email,
        firstName: process.env['SEED_ADMIN_FIRST_NAME'] ?? 'Academy',
        lastName: process.env['SEED_ADMIN_LAST_NAME'] ?? 'Admin',
        passwordHash: await passwords.hash(password.data),
        status: 'active',
        roles: { create: [{ role: 'admin' }] },
      },
    });
    await app.get(AuditService).record({
      actorId: null,
      action: 'user.seeded',
      entity: 'user',
      entityId: user.id,
      after: { email, roles: ['admin'] },
    });
    report(`Created admin ${email}. Sign in to set up two-step verification.`);
  } finally {
    await app.close();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/** CLI output for the person running the seed (Nest logging is silenced above). */
function report(message: string): void {
  process.stdout.write(`${message}
`);
}
