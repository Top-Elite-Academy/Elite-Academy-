import { Injectable } from '@nestjs/common';
import type { MentorProfile, Prisma } from '@eta/db';
import {
  cohortScheduleSchema,
  JOIN_OPENS_MINUTES,
  type MentorAvailability,
  type MentorSession,
  type MentorSessions,
  type SessionOutcomeInput,
  type TimeOffInput,
  type UpdateAvailabilityInput,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { jerusalemToday, TEACHING_TIME_ZONE } from '../../common/time/cohort-calendar';
import { AuditService } from '../audit/audit.service';
import { CHANGE_INCLUDE, SessionChangesService } from './session-changes.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_DAYS = 7;
const NOTES_LOOKBACK_DAYS = 30;
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const MENTOR_SESSION_INCLUDE = {
  user: { select: { firstName: true, lastName: true } },
  package: true,
  credit: { include: { bookings: { select: { startAt: true, status: true } } } },
} satisfies Prisma.BookingInclude;
type MentorSessionRecord = Prisma.BookingGetPayload<{ include: typeof MENTOR_SESSION_INCLUDE }>;

/**
 * The mentor's own schedule (design "Instructor 5"): weekly availability,
 * time off, upcoming sessions and notes after each session.
 */
@Injectable()
export class MentorScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changes: SessionChangesService,
    private readonly audit: AuditService,
  ) {}

  /** The signed-in user's mentor profile; 404 if they do not mentor. */
  private async mentorOf(user: AuthUser): Promise<MentorProfile> {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { userId: user.id } });
    if (!mentor) throw ApiException.notFound('mentor.notLinked');
    return mentor;
  }

  async availability(user: AuthUser): Promise<MentorAvailability> {
    const mentor = await this.mentorOf(user);
    const now = new Date();
    const today = new Date(`${jerusalemToday(now)}T00:00:00Z`);
    const [windows, timeOff, cohorts, booked] = await Promise.all([
      this.prisma.availabilitySlot.findMany({
        where: { mentorId: mentor.id },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.mentorTimeOff.findMany({
        where: { mentorId: mentor.id, endDate: { gte: today } },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.cohort.findMany({
        where: { program: { instructorId: mentor.id }, status: { not: 'finished' } },
      }),
      this.prisma.booking.findMany({
        where: {
          mentorId: mentor.id,
          status: 'confirmed',
          startAt: { gte: now, lt: new Date(now.getTime() + UPCOMING_DAYS * DAY_MS) },
        },
        include: { user: { select: { firstName: true } } },
        orderBy: { startAt: 'asc' },
      }),
    ]);
    return {
      windows: windows.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
      breakMinutes: mentor.breakMinutes,
      minNoticeHours: mentor.minNoticeHours,
      sessionMinutes: mentor.sessionMinutes,
      timeOff: timeOff.map((range) => ({
        id: range.id,
        startDate: range.startDate.toISOString().slice(0, 10),
        endDate: range.endDate.toISOString().slice(0, 10),
      })),
      liveClasses: cohorts.flatMap((cohort) => {
        const schedule = cohortScheduleSchema.safeParse(cohort.schedule);
        if (!schedule.success) return [];
        return schedule.data.days.map((day) => ({
          weekday: WEEKDAYS.indexOf(day),
          startTime: schedule.data.from,
          endTime: schedule.data.to,
        }));
      }),
      booked: booked.map((booking) => ({
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        studentFirstName: booking.user.firstName,
      })),
    };
  }

  /** Replaces the weekly hours and settings. Sessions already booked stay as they are. */
  async updateAvailability(
    user: AuthUser,
    input: UpdateAvailabilityInput,
    client: ClientInfo,
  ): Promise<MentorAvailability> {
    const mentor = await this.mentorOf(user);
    await this.prisma.$transaction([
      this.prisma.availabilitySlot.deleteMany({ where: { mentorId: mentor.id } }),
      this.prisma.availabilitySlot.createMany({
        data: input.windows.map((window) => ({
          ...window,
          mentorId: mentor.id,
          timeZone: TEACHING_TIME_ZONE,
        })),
      }),
      this.prisma.mentorProfile.update({
        where: { id: mentor.id },
        data: { breakMinutes: input.breakMinutes, minNoticeHours: input.minNoticeHours },
      }),
    ]);
    await this.audit.record({
      actorId: user.id,
      action: 'mentor.availabilityUpdated',
      entity: 'mentorProfile',
      entityId: mentor.id,
      after: input,
      client,
    });
    return this.availability(user);
  }

  async addTimeOff(user: AuthUser, input: TimeOffInput, client: ClientInfo): Promise<void> {
    const mentor = await this.mentorOf(user);
    if (input.startDate < jerusalemToday()) throw ApiException.badRequest('timeOff.past');
    const created = await this.prisma.mentorTimeOff.create({
      data: {
        mentorId: mentor.id,
        startDate: new Date(`${input.startDate}T00:00:00Z`),
        endDate: new Date(`${input.endDate}T00:00:00Z`),
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'mentor.timeOffAdded',
      entity: 'mentorTimeOff',
      entityId: created.id,
      after: input,
      client,
    });
  }

  async removeTimeOff(user: AuthUser, id: string): Promise<void> {
    const mentor = await this.mentorOf(user);
    const { count } = await this.prisma.mentorTimeOff.deleteMany({
      where: { id, mentorId: mentor.id },
    });
    if (count === 0) throw ApiException.notFound();
  }

  async sessions(user: AuthUser): Promise<MentorSessions> {
    const mentor = await this.mentorOf(user);
    const now = new Date();
    const [upcoming, needsNotes] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          mentorId: mentor.id,
          status: 'confirmed',
          endAt: { gt: now },
          startAt: { lt: new Date(now.getTime() + UPCOMING_DAYS * DAY_MS) },
        },
        include: MENTOR_SESSION_INCLUDE,
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          mentorId: mentor.id,
          status: 'confirmed',
          endAt: { lte: now, gt: new Date(now.getTime() - NOTES_LOOKBACK_DAYS * DAY_MS) },
        },
        include: MENTOR_SESSION_INCLUDE,
        orderBy: { startAt: 'desc' },
      }),
    ]);
    return {
      upcoming: upcoming.map((booking) => toMentorSession(booking, now)),
      needsNotes: needsNotes.map((booking) => toMentorSession(booking, now)),
    };
  }

  /** After the session: what happened, and notes the student will see. */
  async recordOutcome(
    user: AuthUser,
    bookingId: string,
    input: SessionOutcomeInput,
    client: ClientInfo,
  ): Promise<void> {
    const booking = await this.mentorBooking(user, bookingId);
    if (booking.startAt > new Date()) throw ApiException.conflict('session.notStarted');
    const notes = input.notes || null;
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: input.outcome === 'held' ? 'completed' : 'no_show',
        notes,
        notesAt: notes ? new Date() : null,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'booking.outcomeRecorded',
      entity: 'booking',
      entityId: booking.id,
      after: { outcome: input.outcome },
      client,
    });
    if (notes) await this.changes.tellOtherSide(booking, 'mentor', 'session_notes', {});
  }

  /** The mentor cancels: the student keeps the session (credit or refund) and is told. */
  async cancel(user: AuthUser, bookingId: string, client: ClientInfo): Promise<void> {
    const booking = await this.mentorBooking(user, bookingId);
    if (booking.startAt <= new Date()) throw ApiException.conflict('session.started');
    await this.changes.cancel(booking, 'mentor', user.id, client);
  }

  private async mentorBooking(user: AuthUser, bookingId: string) {
    const mentor = await this.mentorOf(user);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, mentorId: mentor.id, status: 'confirmed' },
      include: CHANGE_INCLUDE,
    });
    if (!booking) throw ApiException.notFound();
    return booking;
  }
}

/** "5 of 8": the session's place in its plan, counting sessions not cancelled. */
function planPosition(booking: MentorSessionRecord) {
  if (!booking.credit) return null;
  const number = booking.credit.bookings.filter(
    (other) => other.status !== 'cancelled' && other.startAt <= booking.startAt,
  ).length;
  return { number, total: booking.credit.total };
}

function toMentorSession(booking: MentorSessionRecord, now: Date): MentorSession {
  const joinable =
    now.getTime() >= booking.startAt.getTime() - JOIN_OPENS_MINUTES * 60_000 && now < booking.endAt;
  return {
    id: booking.id,
    kind: booking.package.kind,
    service: booking.package.code,
    student: booking.user,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status === 'held' ? 'cancelled' : booking.status,
    planPosition: planPosition(booking),
    joinUrl: joinable ? booking.zoomLink : null,
    notes: booking.notes,
  };
}
