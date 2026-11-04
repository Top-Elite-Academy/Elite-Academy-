import { Injectable } from '@nestjs/common';
import { Prisma } from '@eta/db';
import { localize, type SessionNotificationData } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from './availability.service';
import { canChange } from './booking.mapper';

export const CHANGE_INCLUDE = {
  mentor: true,
  package: true,
  order: true,
  user: true,
} satisfies Prisma.BookingInclude;
export type ChangeRecord = Prisma.BookingGetPayload<{ include: typeof CHANGE_INCLUDE }>;

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * Changing a booked session (spec §4.5): cancel, reschedule, and booking the
 * next meeting with a plan credit. The other person is notified every time.
 */
@Injectable()
export class SessionChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  private async ownSession(user: AuthUser, bookingId: string): Promise<ChangeRecord> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId: user.id, status: 'confirmed' },
      include: CHANGE_INCLUDE,
    });
    if (!booking) throw ApiException.notFound();
    // Changes close 24 hours before the start (the policy is shown on the page).
    if (!canChange(booking)) throw ApiException.conflict('session.tooLate');
    return booking;
  }

  /** Student cancels: a plan session goes back to the plan; a paid single session is refunded. */
  async cancelOwn(user: AuthUser, bookingId: string, client: ClientInfo): Promise<void> {
    const booking = await this.ownSession(user, bookingId);
    await this.cancel(booking, 'student', user.id, client);
  }

  /** Mentor or student cancelled: frees the time and gives the session back. */
  async cancel(
    booking: ChangeRecord,
    by: 'student' | 'mentor',
    actorId: string,
    client: ClientInfo,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: by },
      });
      if (booking.creditId) {
        await tx.packageCredit.updateMany({
          where: { id: booking.creditId, used: { gt: 0 } },
          data: { used: { decrement: 1 } },
        });
      } else if (booking.order?.status === 'paid') {
        // Completed by admin in the payment gateway until refunds are automated.
        await tx.order.update({
          where: { id: booking.order.id },
          data: { refundRequestedAt: new Date() },
        });
      }
    });
    await this.audit.record({
      actorId,
      action: 'booking.cancelled',
      entity: 'booking',
      entityId: booking.id,
      after: { by, creditReturned: booking.creditId !== null },
      client,
    });
    await this.tellOtherSide(booking, by, 'session_cancelled', {});
  }

  async rescheduleOwn(
    user: AuthUser,
    bookingId: string,
    startAt: Date,
    client: ClientInfo,
  ): Promise<void> {
    const booking = await this.ownSession(user, bookingId);
    const { maxReschedules } = this.config.sessions;
    if (booking.rescheduleCount >= maxReschedules)
      throw ApiException.conflict('session.rescheduleLimit');
    const free = await this.availability.isFree(
      booking.mentorId,
      booking.package.sessionMinutes,
      startAt,
    );
    if (!free) throw ApiException.conflict('slot.unavailable');
    try {
      // Counted in the same write, so two tabs cannot both use the last move.
      const moved = await this.prisma.booking.updateMany({
        where: { id: booking.id, rescheduleCount: { lt: maxReschedules } },
        data: {
          startAt,
          endAt: new Date(startAt.getTime() + booking.package.sessionMinutes * 60_000),
          rescheduleCount: { increment: 1 },
        },
      });
      if (moved.count === 0) throw ApiException.conflict('session.rescheduleLimit');
    } catch (error) {
      if (isUniqueViolation(error)) throw ApiException.conflict('slot.unavailable');
      throw error;
    }
    await this.audit.record({
      actorId: user.id,
      action: 'booking.rescheduled',
      entity: 'booking',
      entityId: booking.id,
      before: { startAt: booking.startAt.toISOString() },
      after: { startAt: startAt.toISOString() },
      client,
    });
    await this.tellOtherSide({ ...booking, startAt }, 'student', 'session_rescheduled', {
      previousStartAt: booking.startAt.toISOString(),
    });
  }

  /** "Book the next meeting": uses one session of the plan; no payment step. */
  async bookWithCredit(
    user: AuthUser,
    creditId: string,
    startAt: Date,
    client: ClientInfo,
  ): Promise<{ bookingId: string }> {
    const credit = await this.prisma.packageCredit.findFirst({
      where: { id: creditId, userId: user.id },
      include: { package: true },
    });
    if (!credit?.mentorId) throw ApiException.notFound();
    if (credit.used >= credit.total) throw ApiException.conflict('credit.none');
    const { mentorId, package: pkg } = credit;
    if (!(await this.availability.isFree(mentorId, pkg.sessionMinutes, startAt)))
      throw ApiException.conflict('slot.unavailable');

    let bookingId: string;
    try {
      bookingId = await this.prisma.$transaction(async (tx) => {
        // Only if a session is still left at this moment (two tabs cannot both use it).
        const taken = await tx.packageCredit.updateMany({
          where: { id: credit.id, used: { lt: credit.total } },
          data: { used: { increment: 1 } },
        });
        if (taken.count === 0) throw ApiException.conflict('credit.none');
        const created = await tx.booking.create({
          data: {
            userId: user.id,
            mentorId,
            packageId: pkg.id,
            creditId: credit.id,
            startAt,
            endAt: new Date(startAt.getTime() + pkg.sessionMinutes * 60_000),
            status: 'confirmed',
          },
        });
        return created.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw ApiException.conflict('slot.unavailable');
      throw error;
    }

    await this.audit.record({
      actorId: user.id,
      action: 'booking.bookedWithCredit',
      entity: 'booking',
      entityId: bookingId,
      after: { creditId: credit.id, startAt: startAt.toISOString() },
      client,
    });
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: CHANGE_INCLUDE,
    });
    await this.tellOtherSide(booking, 'student', 'session_booked', {});
    return { bookingId };
  }

  /** The student hears from the mentor's side, and the mentor (if they have an account) from the student's. */
  async tellOtherSide(
    booking: ChangeRecord,
    by: 'student' | 'mentor',
    type: 'session_booked' | 'session_cancelled' | 'session_rescheduled' | 'session_notes',
    extra: Partial<SessionNotificationData>,
  ): Promise<void> {
    const toMentor = by === 'student';
    const recipient = toMentor ? booking.mentor.userId : booking.userId;
    if (!recipient) return;
    const data: SessionNotificationData = {
      bookingId: booking.id,
      audience: toMentor ? 'mentor' : 'student',
      name: toMentor
        ? `${booking.user.firstName} ${booking.user.lastName}`
        : localize(booking.mentor.name, booking.user.locale),
      startAt: booking.startAt.toISOString(),
      ...extra,
    };
    await this.notifications.notify([recipient], { type, data });
  }
}
