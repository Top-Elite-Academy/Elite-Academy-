import { Injectable } from '@nestjs/common';
import { Prisma } from '@eta/db';
import {
  type CohortRef,
  localize,
  type PendingEnrollment,
  type StudentEnrollment,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { jerusalemToday } from '../../common/time/cohort-calendar';
import {
  ANNOUNCEMENT_INCLUDE,
  COHORT_INCLUDE,
  instructorName,
  toAnnouncementView,
  toCohortRef,
} from './teaching.mapper';

const STUDENT_ANNOUNCEMENTS = 3;

/**
 * Joining a cohort (product decision): the student picks it and is "pending";
 * admin or sales confirms once payment is arranged, which takes a seat and
 * unlocks the class. Nothing is unlocked by the student's own request.
 */
@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Cohorts a student can ask to join: published programs, open, not started long ago. */
  async available(user: AuthUser): Promise<CohortRef[]> {
    const cohorts = await this.prisma.cohort.findMany({
      where: {
        status: 'open',
        program: { published: true, deletedAt: null },
        startDate: { gte: new Date(`${jerusalemToday()}T00:00:00Z`) },
      },
      include: COHORT_INCLUDE,
      orderBy: { startDate: 'asc' },
    });
    return cohorts.map((cohort) => toCohortRef(cohort, user.locale));
  }

  async request(user: AuthUser, cohortId: string, client: ClientInfo): Promise<StudentEnrollment> {
    const cohort = await this.prisma.cohort.findFirst({
      where: { id: cohortId, status: 'open', program: { published: true, deletedAt: null } },
    });
    if (!cohort) throw ApiException.badRequest('cohort.invalid');

    const enrollment = await this.prisma.enrollment.upsert({
      where: { userId_cohortId: { userId: user.id, cohortId } },
      create: { userId: user.id, cohortId },
      // Asking again after withdrawing starts over; a confirmed place stays confirmed.
      update: {},
    });
    if (enrollment.status === 'withdrawn') {
      await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: 'pending', confirmedAt: null, confirmedById: null },
      });
    }
    await this.audit.record({
      actorId: user.id,
      action: 'enrollment.requested',
      entity: 'enrollment',
      entityId: enrollment.id,
      after: { cohortId },
      client,
    });
    const mine = await this.mine(user);
    const created = mine.find((item) => item.id === enrollment.id);
    if (!created) throw ApiException.notFound();
    return created;
  }

  /** The student's own enrollments; announcements only once confirmed. */
  async mine(user: AuthUser): Promise<StudentEnrollment[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: user.id, status: { in: ['pending', 'confirmed'] } },
      include: {
        cohort: {
          include: {
            ...COHORT_INCLUDE,
            announcements: {
              include: ANNOUNCEMENT_INCLUDE,
              orderBy: { createdAt: 'desc' },
              take: STUDENT_ANNOUNCEMENTS,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      cohort: toCohortRef(enrollment.cohort, user.locale),
      instructorName: instructorName(enrollment.cohort, user.locale),
      announcements:
        enrollment.status === 'confirmed'
          ? enrollment.cohort.announcements.map(toAnnouncementView)
          : [],
    }));
  }

  /** Admin and sales: who is waiting. */
  async pending(staff: AuthUser): Promise<PendingEnrollment[]> {
    const rows = await this.prisma.enrollment.findMany({
      where: { status: 'pending' },
      include: { user: true, cohort: { include: { program: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      student: {
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
      },
      cohort: {
        id: row.cohortId,
        name: row.cohort.name,
        programTitle: localize(row.cohort.program.title, staff.locale),
      },
      requestedAt: row.createdAt.toISOString(),
    }));
  }

  /** Takes a seat and unlocks the class; the student is notified. */
  async confirm(staff: AuthUser, enrollmentId: string, client: ClientInfo): Promise<void> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { user: true, cohort: { include: COHORT_INCLUDE } },
    });
    if (!enrollment || enrollment.status !== 'pending') throw ApiException.notFound();

    try {
      await this.prisma.$transaction([
        this.prisma.enrollment.update({
          where: { id: enrollmentId, status: 'pending' },
          data: { status: 'confirmed', confirmedAt: new Date(), confirmedById: staff.id },
        }),
        // The database refuses more seats than the cohort has (cohorts_seats_valid).
        this.prisma.cohort.update({
          where: { id: enrollment.cohortId },
          data: { seatsTaken: { increment: 1 } },
        }),
      ]);
    } catch (error) {
      if (isSeatLimit(error)) throw ApiException.conflict('cohort.full');
      // Someone else confirmed it a moment ago.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw ApiException.notFound();
      throw error;
    }

    await this.audit.record({
      actorId: staff.id,
      action: 'enrollment.confirmed',
      entity: 'enrollment',
      entityId: enrollmentId,
      before: { status: 'pending' },
      after: { status: 'confirmed' },
      client,
    });
    // Written in the student's language: the notification keeps these names.
    const ref = toCohortRef(enrollment.cohort, enrollment.user.locale);
    await this.notifications.notify([enrollment.userId], {
      type: 'enrollment_confirmed',
      data: { cohortId: ref.id, cohortName: ref.name, programTitle: ref.program.title },
    });
  }
}

/** The database's seat check (cohorts_seats_valid) refused the extra seat. */
const isSeatLimit = (error: unknown) => String(error).includes('cohorts_seats_valid');
