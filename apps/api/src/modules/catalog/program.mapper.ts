import type { Prisma } from '@eta/db';
import { type Locale, localize, type ProgramSummary } from '@eta/shared';

/** Midnight UTC today: cohorts starting today or later are "upcoming". */
export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Explicit allow-list of what the public may see about a program.
 * `priceAgorot` is deliberately absent (spec §1: no program prices on the website).
 */
export const programSummarySelect = () =>
  ({
    slug: true,
    title: true,
    summary: true,
    level: true,
    subject: true,
    tags: true,
    lengthWeeks: true,
    instructor: { select: { name: true } },
    cohorts: {
      where: { status: 'open', startDate: { gte: startOfTodayUtc() } },
      orderBy: { startDate: 'asc' },
      take: 1,
      select: { startDate: true },
    },
  }) satisfies Prisma.ProgramSelect;

type SummaryRecord = Prisma.ProgramGetPayload<{ select: ReturnType<typeof programSummarySelect> }>;

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function toProgramSummary(program: SummaryRecord, locale: Locale): ProgramSummary {
  const nextCohort = program.cohorts[0];
  return {
    slug: program.slug,
    title: localize(program.title, locale),
    summary: localize(program.summary, locale),
    level: program.level,
    subject: program.subject,
    tags: program.tags,
    lengthWeeks: program.lengthWeeks,
    nextCohortStart: nextCohort ? isoDate(nextCohort.startDate) : null,
    instructorName: program.instructor ? localize(program.instructor.name, locale) : null,
  };
}
