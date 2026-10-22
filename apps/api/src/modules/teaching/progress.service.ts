import { Injectable } from '@nestjs/common';
import {
  type CohortAttendance,
  cohortScheduleSchema,
  progressStatus,
  RECENT_CLASSES,
  type SaveAttendanceInput,
  type StudentNoteInput,
  type StudentNoteView,
  type StudentProgress,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isClassDay, jerusalemToday, pastClassDates } from '../../common/time/cohort-calendar';
import { AuditService } from '../audit/audit.service';
import { type CohortRecord, summarise, toCohortRef } from './teaching.mapper';
import { TeachingService } from './teaching.service';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** The cohort's timetable for date maths; null when it has no schedule yet. */
function timetable(cohort: CohortRecord) {
  const schedule = cohortScheduleSchema.safeParse(cohort.schedule);
  return schedule.success
    ? {
        startDate: isoDate(cohort.startDate),
        lengthWeeks: cohort.program.lengthWeeks,
        schedule: schedule.data,
      }
    : null;
}

/**
 * Attendance, the student page and instructor notes (designs "Instructor 2–3").
 * Every call goes through the instructor's own cohort (404 otherwise).
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teaching: TeachingService,
    private readonly audit: AuditService,
  ) {}

  async attendance(user: AuthUser, cohortId: string, date?: string): Promise<CohortAttendance> {
    const cohort = await this.teaching.cohortRecord(user, cohortId);
    const times = timetable(cohort);
    const classes = times ? pastClassDates(times, jerusalemToday(), RECENT_CLASSES) : [];
    const shown = date && classes.includes(date) ? date : (classes[0] ?? null);

    const [enrollments, marks] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { cohortId, status: 'confirmed' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { user: { firstName: 'asc' } },
      }),
      shown
        ? this.prisma.attendance.findMany({ where: { cohortId, classDate: asDate(shown) } })
        : Promise.resolve([]),
    ]);
    return {
      classes,
      date: shown,
      students: enrollments.map(({ user: student }) => ({
        userId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        status: marks.find((mark) => mark.userId === student.id)?.status ?? null,
      })),
    };
  }

  /** Saves the marks for one class day (a real past class, confirmed students only). */
  async saveAttendance(
    user: AuthUser,
    cohortId: string,
    input: SaveAttendanceInput,
    client: ClientInfo,
  ): Promise<void> {
    const cohort = await this.teaching.cohortRecord(user, cohortId);
    const times = timetable(cohort);
    if (!times || input.date > jerusalemToday() || !isClassDay(times, input.date))
      throw ApiException.badRequest('attendance.notAClass');

    const confirmed = await this.prisma.enrollment.findMany({
      where: { cohortId, status: 'confirmed', userId: { in: input.marks.map((m) => m.userId) } },
      select: { userId: true },
    });
    if (confirmed.length !== new Set(input.marks.map((m) => m.userId)).size)
      throw ApiException.badRequest('attendance.notInCohort');

    const classDate = asDate(input.date);
    await this.prisma.$transaction(
      input.marks.map((mark) =>
        this.prisma.attendance.upsert({
          where: { cohortId_userId_classDate: { cohortId, userId: mark.userId, classDate } },
          create: {
            cohortId,
            userId: mark.userId,
            classDate,
            status: mark.status,
            markedById: user.id,
          },
          update: { status: mark.status, markedById: user.id },
        }),
      ),
    );
    await this.audit.record({
      actorId: user.id,
      action: 'attendance.saved',
      entity: 'cohort',
      entityId: cohortId,
      after: { date: input.date, marks: input.marks.length },
      client,
    });
  }

  async student(user: AuthUser, cohortId: string, studentId: string): Promise<StudentProgress> {
    const cohort = await this.teaching.cohortRecord(user, cohortId);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { cohortId, userId: studentId, status: { in: ['pending', 'confirmed'] } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, lastLoginAt: true } },
      },
    });
    if (!enrollment) throw ApiException.notFound();

    const times = timetable(cohort);
    const recentDates = times ? pastClassDates(times, jerusalemToday(), RECENT_CLASSES) : [];
    const [marks, notes, plan] = await Promise.all([
      this.prisma.attendance.findMany({ where: { cohortId, userId: studentId } }),
      this.notes(cohortId, studentId),
      this.mentoringPlan(user, studentId),
    ]);
    const summary = summarise(marks);
    return {
      student: {
        userId: enrollment.user.id,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
      },
      cohort: toCohortRef(cohort, user.locale),
      enrollment: {
        status: enrollment.status,
        requestedAt: enrollment.createdAt.toISOString(),
        confirmedAt: enrollment.confirmedAt?.toISOString() ?? null,
      },
      attendance: {
        ...summary,
        recent: recentDates.map((date) => ({
          date,
          status: marks.find((mark) => isoDate(mark.classDate) === date)?.status ?? null,
        })),
      },
      status: progressStatus(summary.attended, summary.marked),
      lastActiveAt: enrollment.user.lastLoginAt?.toISOString() ?? null,
      mentoringPlan: plan,
      notes,
    };
  }

  /** The student's plan with this instructor (if they mentor), and the last session's notes. */
  private async mentoringPlan(user: AuthUser, studentId: string) {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { userId: user.id } });
    if (!mentor) return null;
    const credit = await this.prisma.packageCredit.findFirst({
      where: { userId: studentId, mentorId: mentor.id },
      orderBy: { createdAt: 'desc' },
      include: {
        bookings: {
          where: { status: { in: ['completed', 'no_show'] } },
          orderBy: { startAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!credit) return null;
    const last = credit.bookings[0];
    return {
      total: credit.total,
      used: credit.used,
      lastSession: last ? { startAt: last.startAt.toISOString(), notes: last.notes } : null,
    };
  }

  private async notes(cohortId: string, studentId: string): Promise<StudentNoteView[]> {
    const rows = await this.prisma.studentNote.findMany({
      where: { cohortId, studentId },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      authorName: `${row.author.firstName} ${row.author.lastName}`,
      sharedWithAdmissions: row.sharedWithAdmissions,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /** Staff-only note: never part of anything the student can read. */
  async addNote(
    user: AuthUser,
    cohortId: string,
    studentId: string,
    input: StudentNoteInput,
    client: ClientInfo,
  ): Promise<StudentNoteView[]> {
    await this.teaching.cohortRecord(user, cohortId);
    const enrolled = await this.prisma.enrollment.count({
      where: { cohortId, userId: studentId, status: { in: ['pending', 'confirmed'] } },
    });
    if (enrolled === 0) throw ApiException.notFound();
    const note = await this.prisma.studentNote.create({
      data: {
        cohortId,
        studentId,
        authorId: user.id,
        body: input.body,
        sharedWithAdmissions: input.sharedWithAdmissions,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'studentNote.added',
      entity: 'studentNote',
      entityId: note.id,
      after: { cohortId, studentId, sharedWithAdmissions: input.sharedWithAdmissions },
      client,
    });
    return this.notes(cohortId, studentId);
  }
}
