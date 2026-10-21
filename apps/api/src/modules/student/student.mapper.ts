import type { Prisma } from '@eta/db';
import {
  JOIN_OPENS_MINUTES,
  type Locale,
  localize,
  type StudentOrder,
  type StudentSession,
} from '@eta/shared';
import { liveHoldUntil } from '../booking/booking.mapper';

export const SESSION_INCLUDE = { mentor: true, package: true } satisfies Prisma.BookingInclude;
type SessionRecord = Prisma.BookingGetPayload<{ include: typeof SESSION_INCLUDE }>;

export const ORDER_INCLUDE = { bookings: true } satisfies Prisma.OrderInclude;
type OrderRecord = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/** The meeting link is shared only from 15 minutes before the start until the end (spec §4.3). */
export function toStudentSession(
  booking: SessionRecord,
  locale: Locale,
  now = new Date(),
): StudentSession {
  const joinOpensAt = new Date(booking.startAt.getTime() - JOIN_OPENS_MINUTES * 60_000);
  const joinable = booking.status === 'confirmed' && now >= joinOpensAt && now < booking.endAt;
  return {
    id: booking.id,
    kind: booking.package.kind,
    service: booking.package.code,
    mentor: {
      id: booking.mentor.id,
      name: localize(booking.mentor.name, locale),
      photoPath: booking.mentor.photoPath,
    },
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    // Holds never reach the student area; the query filters them out.
    status: booking.status === 'held' ? 'cancelled' : booking.status,
    joinUrl: joinable ? booking.zoomLink : null,
    joinOpensAt: joinOpensAt.toISOString(),
  };
}

/** The first item of the order snapshot (one package per order today). */
function firstItem(items: Prisma.JsonValue): { packageCode: string; sessions: number } {
  const first = Array.isArray(items) ? items[0] : null;
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    const { packageCode, sessions } = first;
    if (typeof packageCode === 'string' && typeof sessions === 'number')
      return { packageCode, sessions };
  }
  return { packageCode: 'unknown', sessions: 1 };
}

export function toStudentOrder(order: OrderRecord, now = new Date()): StudentOrder {
  const item = firstItem(order.items);
  // "Try again" only while the booking's time is still held for this order.
  const retryable =
    order.status === 'failed'
      ? order.bookings.find((booking) => liveHoldUntil(booking, now))
      : undefined;
  return {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    service: item.packageCode,
    sessions: item.sessions,
    amountAgorot: order.amountAgorot,
    status: order.status,
    failureReason: order.failureReason,
    retryBookingId: retryable?.id ?? null,
  };
}
