import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigModule } from '../config/app-config.module';
import { loadEnvFile } from '../config/load-env';
import { EXAMPLE_STORIES, FAQS, INSTRUCTORS, PROGRAMS } from './seed-data/public-content';
import { seedProgramDetails } from './seed-program-details';

@Module({ imports: [AppConfigModule, CommonModule] })
class SeedModule {}

/** Returns instructor ids by slug. */
async function seedInstructors(prisma: PrismaService): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const { slug, ...data } of INSTRUCTORS) {
    const profile = await prisma.mentorProfile.upsert({
      where: { slug },
      create: { slug, kind: 'instructor', languages: ['ar', 'he', 'en'], ...data },
      update: data,
    });
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
    await seedPrograms(prisma, await seedInstructors(prisma));
    await seedFaqs(prisma);
    await seedExampleStories(prisma);
    process.stdout.write(
      `Seeded ${PROGRAMS.length} programs, ${INSTRUCTORS.length} instructors, ` +
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
