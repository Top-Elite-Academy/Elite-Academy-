import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import {
  addDays,
  type CohortStudent,
  type TeachCohort,
  type TeachScheduleItem,
  type TeachToday,
  zonedToUtc,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { jerusalemToday, liveClasses, TEACHING_TIME_ZONE } from '../../common/time/cohort-calendar';
import {
  ANNOUNCEMENT_INCLUDE,
  COHORT_INCLUDE,
  type CohortRecord,
  toAnnouncementView,
  toTeachCohort,
} from './teaching.mapper';

const TODAY_ANNOUNCEMENTS = 5;
const WEEK_DAYS = 7;

/**
 * The instructor's view of their own cohorts (design "Instructor 1–2").
 * An instructor sees only cohorts of programs they teach; admin sees all.
 */
@Injectable()
export class TeachingService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: AuthUser): Prisma.CohortWhereInput {
    return user.roles.includes('admin') ? {} : { program: { instructor: { userId: user.id } } };
  }

  /** One of the user's cohorts, or 404 (never reveals other cohorts). */
  async cohortRecord(user: AuthUser, cohortId: string): Promise<CohortRecord> {
    const cohort = await this.prisma.cohort.findFirst({
      where: { id: cohortId, ...this.scope(user) },
      include: COHORT_INCLUDE,
    });
    if (!cohort) throw ApiException.notFound();
    return cohort;
  }

  async cohorts(user: AuthUser): Promise<TeachCohort[]> {
    const cohorts = await this.prisma.cohort.findMany({
      where: { ...this.scope(user), status: { not: 'finished' } },
      include: COHORT_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
    const counts = await this.prisma.enrollment.groupBy({
      by: ['cohortId', 'status'],
      where: { cohortId: { in: cohorts.map((cohort) => cohort.id) } },
      _count: true,
    });
    const count = (cohortId: string, status: 'confirmed' | 'pending') =>
      counts.find((row) => row.cohortId === cohortId && row.status === status)?._count ?? 0;
    const today = jerusalemToday();
    return cohorts.map((cohort) =>
      toTeachCohort(
        cohort,
        { confirmed: count(cohort.id, 'confirmed'), pending: count(cohort.id, 'pending') },
        user.locale,
        today,
      ),
    );
  }

  async cohort(user: AuthUser, cohortId: string): Promise<TeachCohort> {
    const found = (await this.cohorts(user)).find((cohort) => cohort.id === cohortId);
    if (!found) throw ApiException.notFound();
    return found;
  }

  /** Students in the cohort. Contact and payment details are not part of this view. */
  async students(user: AuthUser, cohortId: string): Promise<CohortStudent[]> {
    await this.cohortRecord(user, cohortId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { cohortId, status: { in: ['pending', 'confirmed'] } },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ status: 'asc' }, { user: { firstName: 'asc' } }],
    });
    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      userId: enrollment.user.id,
      firstName: enrollment.user.firstName,
      lastName: enrollment.user.lastName,
      status: enrollment.status,
      requestedAt: enrollment.createdAt.toISOString(),
      confirmedAt: enrollment.confirmedAt?.toISOString() ?? null,
    }));
  }

  /** "Today" (design "Instructor 1"): numbers, today's and tomorrow's schedule, announcements. */
  async today(user: AuthUser): Promise<TeachToday> {
    const cohorts = await this.cohorts(user);
    const today = jerusalemToday();
    const [schedule, week, announcements] = await Promise.all([
      this.schedule(user, cohorts, today, 2),
      this.schedule(user, cohorts, today, WEEK_DAYS),
      this.prisma.announcement.findMany({
        where: { cohortId: { in: cohorts.map((cohort) => cohort.id) } },
        include: ANNOUNCEMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: TODAY_ANNOUNCEMENTS,
      }),
    ]);
    return {
      cohorts,
      stats: {
        students: cohorts.reduce((sum, cohort) => sum + cohort.confirmed, 0),
        pending: cohorts.reduce((sum, cohort) => sum + cohort.pending, 0),
        sessionsThisWeek: week.length,
      },
      schedule,
      announcements: announcements.map(toAnnouncementView),
    };
  }

  /** Live classes of the cohorts plus the instructor's own mentoring sessions. */
  private async schedule(
    user: AuthUser,
    cohorts: TeachCohort[],
    fromIso: string,
    days: number,
  ): Promise<TeachScheduleItem[]> {
    const from = zonedToUtc(fromIso, '00:00', TEACHING_TIME_ZONE);
    const until = zonedToUtc(addDays(fromIso, days), '00:00', TEACHING_TIME_ZONE);
    const now = new Date();

    const classes = cohorts.flatMap((cohort) =>
      cohort.schedule
        ? liveClasses(
            {
              startDate: cohort.startDate,
              lengthWeeks: cohort.program.lengthWeeks,
              schedule: cohort.schedule,
            },
            fromIso,
            days,
          ).map((slot): TeachScheduleItem => ({
            kind: 'liveClass',
            startAt: slot.startAt.toISOString(),
            endAt: slot.endAt.toISOString(),
            title: `${cohort.name} · ${cohort.program.title}`,
            cohortId: cohort.id,
            bookingId: null,
            service: null,
          }))
        : [],
    );

    const bookings = await this.prisma.booking.findMany({
      where: {
        mentor: { userId: user.id },
        status: 'confirmed',
        startAt: { gte: from, lt: until },
      },
      include: { user: true, package: true },
    });
    const sessions = bookings.map((booking): TeachScheduleItem => ({
      kind: booking.package.kind === 'career' ? 'career' : 'mentoring',
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      title: `${booking.user.firstName} ${booking.user.lastName}`,
      cohortId: null,
      bookingId: booking.id,
      service: booking.package.code,
    }));

    return [...classes, ...sessions]
      .filter((item) => Date.parse(item.endAt) > now.getTime())
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }
}
