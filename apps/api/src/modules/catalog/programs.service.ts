import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import { type Locale, localize, type ProgramSummary } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Explicit allow-list of what the public may see about a program.
 * `priceAgorot` is deliberately absent (spec §1: no program prices on the website).
 */
const PUBLIC_PROGRAM_SELECT = {
  slug: true,
  title: true,
  summary: true,
  level: true,
  subject: true,
  tags: true,
  lengthWeeks: true,
  instructor: { select: { name: true } },
} satisfies Prisma.ProgramSelect;

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Published programs; `topOnly` returns the landing page's "top programs" in their set order. */
  async list(locale: Locale, topOnly: boolean): Promise<ProgramSummary[]> {
    const today = startOfTodayUtc();
    const programs = await this.prisma.program.findMany({
      where: { published: true, deletedAt: null, ...(topOnly ? { isTop: true } : {}) },
      orderBy: topOnly ? [{ topOrder: 'asc' }, { slug: 'asc' }] : [{ slug: 'asc' }],
      select: {
        ...PUBLIC_PROGRAM_SELECT,
        cohorts: {
          where: { status: 'open', startDate: { gte: today } },
          orderBy: { startDate: 'asc' },
          take: 1,
          select: { startDate: true },
        },
      },
    });

    return programs.map((program) => ({
      slug: program.slug,
      title: localize(program.title, locale),
      summary: localize(program.summary, locale),
      level: program.level,
      subject: program.subject,
      tags: program.tags,
      lengthWeeks: program.lengthWeeks,
      nextCohortStart: program.cohorts[0]?.startDate.toISOString().slice(0, 10) ?? null,
      instructorName: program.instructor ? localize(program.instructor.name, locale) : null,
    }));
  }
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
