import { Injectable } from '@nestjs/common';
import type { Locale, ProgramSummary } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { programSummarySelect, toProgramSummary } from './program.mapper';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Published programs; `topOnly` returns the landing page's "top programs" in their set order. */
  async list(locale: Locale, topOnly: boolean): Promise<ProgramSummary[]> {
    const programs = await this.prisma.program.findMany({
      where: { published: true, deletedAt: null, ...(topOnly ? { isTop: true } : {}) },
      orderBy: topOnly ? [{ topOrder: 'asc' }, { slug: 'asc' }] : [{ slug: 'asc' }],
      select: programSummarySelect(),
    });
    return programs.map((program) => toProgramSummary(program, locale));
  }
}
