import { PrismaService } from '../common/prisma/prisma.service';
import {
  PROGRAM_DETAILS,
  PROGRAM_FAQS,
  type SeedCohort,
  type SeedProgramDetails,
} from './seed-data/program-details';

async function upsertCohort(prisma: PrismaService, programId: string, cohort: SeedCohort) {
  const data = { ...cohort, startDate: new Date(`${cohort.startDate}T00:00:00Z`) };
  const existing = await prisma.cohort.findFirst({ where: { programId, name: cohort.name } });
  if (existing) await prisma.cohort.update({ where: { id: existing.id }, data });
  else await prisma.cohort.create({ data: { programId, ...data } });
}

/** Curriculum units are replaced as a whole: the seed is the source of truth until admin editing. */
async function replaceModules(
  prisma: PrismaService,
  programId: string,
  modules: SeedProgramDetails['modules'],
) {
  await prisma.$transaction([
    prisma.programModule.deleteMany({ where: { programId } }),
    prisma.programModule.createMany({
      data: modules.map((module, index) => ({ programId, sortOrder: index + 1, ...module })),
    }),
  ]);
}

async function upsertProgramFaqs(prisma: PrismaService, programId: string, slug: string) {
  for (const [index, { key, ...data }] of PROGRAM_FAQS.entries()) {
    const fullKey = `program.${slug}.${key}`;
    const fields = { ...data, programId, sortOrder: index + 1, published: true };
    await prisma.faq.upsert({
      where: { key: fullKey },
      create: { key: fullKey, ...fields },
      update: fields,
    });
  }
}

/** Course details content for one program (spec §3.3): text fields, cohorts, modules, FAQ. */
export async function seedProgramDetails(prisma: PrismaService, programId: string, slug: string) {
  const details = PROGRAM_DETAILS[slug];
  if (!details) return;
  const { modules, cohorts, ...fields } = details;
  await prisma.program.update({ where: { id: programId }, data: fields });
  for (const cohort of cohorts) await upsertCohort(prisma, programId, cohort);
  await replaceModules(prisma, programId, modules);
  await upsertProgramFaqs(prisma, programId, slug);
}
