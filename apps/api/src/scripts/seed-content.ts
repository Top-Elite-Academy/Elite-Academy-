import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigModule } from '../config/app-config.module';
import { loadEnvFile } from '../config/load-env';
import {
  AVAILABILITY,
  EXAMPLE_CAREER_ADVISORS,
  EXAMPLE_STORIES,
  FAQS,
  INSTRUCTORS,
  PACKAGES,
  PROGRAMS,
  type SeedInstructor,
} from './seed-data/public-content';
import { seedProgramDetails } from './seed-program-details';

@Module({ imports: [AppConfigModule, CommonModule] })
class SeedModule {}

/** Starting weekly hours for a mentor who has none. Mentors edit their own afterwards, so existing hours are kept. */
async function seedAvailability(prisma: PrismaService, mentorId: string, slug: string) {
  if ((await prisma.availabilitySlot.count({ where: { mentorId } })) > 0) return;
  await prisma.availabilitySlot.createMany({
    data: (AVAILABILITY[slug] ?? []).map((window) => ({ mentorId, ...window })),
  });
}

/** Returns mentor ids by slug. */
async function seedMentors(
  prisma: PrismaService,
  mentors: SeedInstructor[],
  options: { kind: 'instructor' | 'career'; isExample: boolean; sessionMinutes: number },
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const { slug, ...data } of mentors) {
    const fields = { ...data, ...options };
    const profile = await prisma.mentorProfile.upsert({
      where: { slug },
      create: { slug, ...fields },
      update: fields,
    });
    await seedAvailability(prisma, profile.id, slug);
    ids.set(slug, profile.id);
  }
  return ids;
}

async function seedPrograms(prisma: PrismaService, instructorIds: Map<string, string>) {
  for (const { slug, instructorSlug, topOrder, ...data } of PROGRAMS) {
    const fields = {
      ...data,
      isTop: topOrder !== null,
      topOrder,
      published: true,
      instructorId: instructorSlug ? (instructorIds.get(instructorSlug) ?? null) : null,
    };
    const program = await prisma.program.upsert({
      where: { slug },
      create: { slug, ...fields },
      update: fields,
    });
    await seedProgramDetails(prisma, program.id, slug);
  }
}

async function seedPackages(prisma: PrismaService) {
  for (const [index, { code, ...data }] of PACKAGES.entries()) {
    const fields = { ...data, sortOrder: index + 1, active: true };
    await prisma.package.upsert({ where: { code }, create: { code, ...fields }, update: fields });
  }
  // Retired packages stay for order history but can no longer be booked.
  await prisma.package.updateMany({
    where: { code: { notIn: PACKAGES.map((pkg) => pkg.code) } },
    data: { active: false },
  });
}

async function seedFaqs(prisma: PrismaService) {
  for (const [index, { key, ...data }] of FAQS.entries()) {
    const fields = { ...data, sortOrder: index + 1, published: true };
    await prisma.faq.upsert({ where: { key }, create: { key, ...fields }, update: fields });
  }
}

async function seedExampleStories(prisma: PrismaService) {
  for (const { key, ...data } of EXAMPLE_STORIES) {
    const fields = { ...data, isExample: true, published: false };
    await prisma.successStory.upsert({
      where: { key },
      create: { key, ...fields },
      update: fields,
    });
  }
}

/**
 * Creates or updates the public content (programs, cohorts, instructors, FAQ,
 * example stories). Safe to run many times: records are matched by slug/key.
 */
async function seedContent(): Promise<void> {
  loadEnvFile();
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  try {
    const instructorIds = await seedMentors(prisma, INSTRUCTORS, {
      kind: 'instructor',
      isExample: false,
      sessionMinutes: 60,
    });
    await seedMentors(prisma, EXAMPLE_CAREER_ADVISORS, {
      kind: 'career',
      isExample: true,
      sessionMinutes: 45,
    });
    await seedPrograms(prisma, instructorIds);
    await seedFaqs(prisma);
    await seedPackages(prisma);
    await seedExampleStories(prisma);
    process.stdout.write(
      `Seeded ${PROGRAMS.length} programs, ${INSTRUCTORS.length} instructors, ` +
        `${EXAMPLE_CAREER_ADVISORS.length} example career advisors, ${PACKAGES.length} packages, ` +
        `${FAQS.length} FAQs, ${EXAMPLE_STORIES.length} example stories.\n`,
    );
  } finally {
    await app.close();
  }
}

seedContent().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
