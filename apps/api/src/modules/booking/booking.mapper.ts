import type { Prisma } from '@eta/db';
import { type BookingView, CHANGE_DEADLINE_HOURS, type Locale, localize } from '@eta/shared';

export const BOOKING_INCLUDE = {
  order: true,
  package: true,
  mentor: true,
  credit: true,
} satisfies Prisma.BookingInclude;

export type BookingRecord = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

/** A hold counts only until it expires. */
export function liveHoldUntil(
  booking: Pick<BookingRecord, 'status' | 'holdExpiresAt'>,
  now = new Date(),
): Date | null {
  const until = booking.holdExpiresAt;
  return booking.status === 'held' && until && until > now ? until : null;
}

/** What the booker sees about their own booking. An expired, unpaid hold reads as cancelled. */
export function toBookingView(booking: BookingRecord, locale: Locale): BookingView {
  const holdUntil = liveHoldUntil(booking);
  const { order, credit } = booking;
  return {
    id: booking.id,
    status: booking.status === 'held' && !holdUntil ? 'cancelled' : booking.status,
    paymentStatus: order?.status ?? null,
    failureReason: order?.failureReason ?? null,
    service: booking.package.code,
    sessions: booking.package.sessions,
    sessionMinutes: booking.package.sessionMinutes,
    mentor: { id: booking.mentor.id, name: localize(booking.mentor.name, locale) },
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    amountAgorot: order?.amountAgorot ?? 0,
    holdExpiresAt: holdUntil?.toISOString() ?? null,
    creditsLeft: credit ? credit.total - credit.used : null,
  };
}

/** Reschedule and cancel are open until 24 hours before the start (spec §4.5). */
export const canChange = (booking: { status: string; startAt: Date }, now = new Date()) =>
  booking.status === 'confirmed' &&
  booking.startAt.getTime() - now.getTime() >= CHANGE_DEADLINE_HOURS * 60 * 60 * 1000;

/** Rescheduling also needs a move left (SESSION_MAX_RESCHEDULES); cancelling does not. */
export const canReschedule = (
  booking: { status: string; startAt: Date; rescheduleCount: number },
  maxReschedules: number,
  now = new Date(),
) => canChange(booking, now) && booking.rescheduleCount < maxReschedules;
