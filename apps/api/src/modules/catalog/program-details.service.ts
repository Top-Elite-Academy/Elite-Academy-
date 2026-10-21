import { Injectable } from '@nestjs/common';
import {
  type CohortInfo,
  cohortScheduleSchema,
  type Locale,
  localize,
  localizeList,
  type ProgramDetails,
} from '@eta/shared';
import { ApiException } from '../../common/errors/api.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isoDate, programSummarySelect, startOfTodayUtc, toProgramSummary } from './program.mapper';

/** Course details page (spec §3.3). Never returns the internal price. */
@Injectable()
export class ProgramDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(slug: string, locale: Locale): Promise<ProgramDetails> {
    const program = await this.prisma.program.findFirst({
      where: { slug, published: true, deletedAt: null },
      select: {
        ...programSummarySelect(),
        overview: true,
        audience: true,
        outcomes: true,
        teachingLanguages: true,
        modules: { orderBy: { sortOrder: 'asc' } },
        faqs: { where: { published: true }, orderBy: { sortOrder: 'asc' } },
        instructor: {
          select: {
            id: true,
            name: true,
            role: true,
            bio: true,
            photoPath: true,
            languages: true,
            active: true,
          },
        },
      },
    });
    if (!program) throw ApiException.notFound();

    const instructor = program.instructor?.active ? program.instructor : null;
    return {
      ...toProgramSummary(program, locale),
      overview: localize(program.overview, locale),
      audience: localize(program.audience, locale),
      outcomes: localizeList(program.outcomes, locale),
      teachingLanguages: program.teachingLanguages,
      modules: program.modules.map((module) => ({
        order: module.sortOrder,
        title: localize(module.title, locale),
        weekFrom: module.weekFrom,
        weekTo: module.weekTo,
        topics: localizeList(module.topics, locale),
      })),
      cohorts: await this.upcomingCohorts(slug),
      instructor: instructor && {
        id: instructor.id,
        name: localize(instructor.name, locale),
        role: localize(instructor.role, locale),
        bio: localize(instructor.bio, locale),
        photoPath: instructor.photoPath,
        languages: instructor.languages,
      },
      faqs: program.faqs.map((faq) => ({
        key: faq.key,
        question: localize(faq.question, locale),
        answer: localize(faq.answer, locale),
      })),
    };
  }

  /** Upcoming open and full cohorts; a full one (or one with no seats left) is shown disabled. */
  private async upcomingCohorts(slug: string): Promise<CohortInfo[]> {
    const cohorts = await this.prisma.cohort.findMany({
      where: {
        program: { slug },
        status: { in: ['open', 'full'] },
        startDate: { gte: startOfTodayUtc() },
      },
      orderBy: { startDate: 'asc' },
    });
    return cohorts.map((cohort) => {
      const seatsLeft = Math.max(cohort.seatsTotal - cohort.seatsTaken, 0);
      const schedule = cohortScheduleSchema.safeParse(cohort.schedule);
      return {
        id: cohort.id,
        startDate: isoDate(cohort.startDate),
        schedule: schedule.success ? schedule.data : null,
        seatsLeft,
        status: cohort.status === 'full' || seatsLeft === 0 ? 'full' : 'open',
      };
    });
  }
}
