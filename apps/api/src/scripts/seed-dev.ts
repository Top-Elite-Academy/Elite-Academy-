import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { addDays, passwordSchema } from '@eta/shared';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigModule } from '../config/app-config.module';
import { loadEnvFile } from '../config/load-env';
import { BreachedPasswordService } from '../modules/auth/services/breached-password.service';
import { PasswordService } from '../modules/auth/services/password.service';
import { jerusalemToday } from '../modules/teaching/cohort-calendar';
import { EXAMPLE_STUDENTS, INSTRUCTOR_ACCOUNTS } from './seed-data/dev-accounts';

@Module({
  imports: [AppConfigModule, CommonModule],
  providers: [PasswordService, BreachedPasswordService],
})
class SeedModule {}

const RUNNING_WEEK = 12;
const FULL_STACK = 'full-stack-advanced-ai';

interface Person {
  email: string;
  firstName: string;
  lastName: string;
}

/** Creates the account once; an existing one is left as it is. */
function accountMaker(prisma: PrismaService, passwordHash: string) {
  return (person: Person, role: 'instructor' | 'student') =>
    prisma.user.upsert({
      where: { email: person.email },
      create: { ...person, passwordHash, status: 'active', roles: { create: [{ role }] } },
      update: {},
    });
}

/** "FSA-03", in its 12th week, like the instructor design. */
async function runningCohort(prisma: PrismaService, programId: string) {
  const existing = await prisma.cohort.findFirst({ where: { programId, name: 'FSA-03' } });
  if (existing) return existing;
  return prisma.cohort.create({
    data: {
      programId,
      name: 'FSA-03',
      startDate: new Date(`${addDays(jerusalemToday(), -(RUNNING_WEEK - 1) * 7)}T00:00:00Z`),
      schedule: { days: ['sun', 'wed'], from: '18:00', to: '21:00' },
      seatsTotal: 20,
      status: 'running',
    },
  });
}

async function enroll(prisma: PrismaService, userId: string, cohortId: string, confirmed: boolean) {
  const existing = await prisma.enrollment.findUnique({
    where: { userId_cohortId: { userId, cohortId } },
  });
  if (existing) return;
  await prisma.enrollment.create({
    data: confirmed
      ? { userId, cohortId, status: 'confirmed', confirmedAt: new Date() }
      : { userId, cohortId },
  });
  if (confirmed)
    await prisma.cohort.update({ where: { id: cohortId }, data: { seatsTaken: { increment: 1 } } });
}

function assertDevelopment(): string {
  if (process.env['NODE_ENV'] === 'production' || process.env['SHOW_EXAMPLE_CONTENT'] !== 'true') {
    throw new Error('The dev seed runs only in development with SHOW_EXAMPLE_CONTENT=true.');
  }
  const password = passwordSchema.safeParse(process.env['SEED_DEV_PASSWORD'] ?? '');
  if (!password.success) throw new Error('Set SEED_DEV_PASSWORD (min 10 characters) in .env');
  return password.data;
}

/**
 * Development only: instructor accounts linked to the instructor profiles, a
 * running example cohort and example students, so the instructor and student
 * areas can be tried. Safe to run many times.
 */
async function seedDev(): Promise<void> {
  loadEnvFile();
  const password = assertDevelopment();
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    const prisma = app.get(PrismaService);
    const account = accountMaker(prisma, await app.get(PasswordService).hash(password));

    for (const { mentorSlug, ...person } of INSTRUCTOR_ACCOUNTS) {
      const user = await account(person, 'instructor');
      await prisma.mentorProfile.update({ where: { slug: mentorSlug }, data: { userId: user.id } });
    }

    const program = await prisma.program.findUniqueOrThrow({ where: { slug: FULL_STACK } });
    const running = await runningCohort(prisma, program.id);
    const upcoming = await prisma.cohort.findFirst({
      where: { programId: program.id, status: 'open' },
      orderBy: { startDate: 'asc' },
    });

    for (const [index, person] of EXAMPLE_STUDENTS.entries()) {
      const user = await account(person, 'student');
      const asksForNext = upcoming !== null && index >= EXAMPLE_STUDENTS.length - 2;
      await enroll(prisma, user.id, asksForNext ? upcoming.id : running.id, !asksForNext);
    }

    process.stdout.write(
      `Dev accounts ready (password: SEED_DEV_PASSWORD in .env):\n` +
        INSTRUCTOR_ACCOUNTS.map((i) => `  instructor  ${i.email}\n`).join('') +
        EXAMPLE_STUDENTS.map((s) => `  student     ${s.email}\n`).join(''),
    );
  } finally {
    await app.close();
  }
}

seedDev().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
