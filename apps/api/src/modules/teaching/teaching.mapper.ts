import type { Prisma } from '@eta/db';
import {
  type AnnouncementView,
  cohortScheduleSchema,
  type CohortRef,
  type Locale,
  localize,
  type TeachCohort,
} from '@eta/shared';
import { cohortWeek } from '../../common/time/cohort-calendar';

export const COHORT_INCLUDE = {
  program: { include: { instructor: true } },
} satisfies Prisma.CohortInclude;
export type CohortRecord = Prisma.CohortGetPayload<{ include: typeof COHORT_INCLUDE }>;

export const ANNOUNCEMENT_INCLUDE = { author: true } satisfies Prisma.AnnouncementInclude;
type AnnouncementRecord = Prisma.AnnouncementGetPayload<{ include: typeof ANNOUNCEMENT_INCLUDE }>;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export function toCohortRef(cohort: CohortRecord, locale: Locale): CohortRef {
  const schedule = cohortScheduleSchema.safeParse(cohort.schedule);
  return {
    id: cohort.id,
    name: cohort.name,
    startDate: isoDate(cohort.startDate),
    schedule: schedule.success ? schedule.data : null,
    program: {
      slug: cohort.program.slug,
      title: localize(cohort.program.title, locale),
      lengthWeeks: cohort.program.lengthWeeks,
    },
  };
}

export function toTeachCohort(
  cohort: CohortRecord,
  counts: { confirmed: number; pending: number },
  locale: Locale,
  todayIso: string,
): TeachCohort {
  const ref = toCohortRef(cohort, locale);
  return {
    ...ref,
    status: cohort.status,
    seatsTotal: cohort.seatsTotal,
    ...counts,
    week: cohortWeek(ref.startDate, ref.program.lengthWeeks, todayIso),
  };
}

export const instructorName = (cohort: CohortRecord, locale: Locale): string | null =>
  cohort.program.instructor ? localize(cohort.program.instructor.name, locale) : null;

export const toAnnouncementView = (announcement: AnnouncementRecord): AnnouncementView => ({
  id: announcement.id,
  cohortId: announcement.cohortId,
  title: announcement.title,
  body: announcement.body,
  authorName: `${announcement.author.firstName} ${announcement.author.lastName}`,
  createdAt: announcement.createdAt.toISOString(),
});
