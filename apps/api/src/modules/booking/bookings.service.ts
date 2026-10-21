import { Injectable } from '@nestjs/common';
import { type Booking, Prisma } from '@eta/db';
import {
  type BookingView,
  CONSENT_TEXTS,
  CURRENT_TERMS_CONSENT,
  type HoldBookingInput,
  type HoldResponse,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentProviderRegistry } from '../payments/payment-provider.registry';
import { AvailabilityService } from './availability.service';
import { BOOKING_INCLUDE, liveHoldUntil, toBookingView } from './booking.mapper';
import { BookingCatalogService } from './booking-catalog.service';

/** Spec §3.7: a slot is held for 10 minutes while paying. */
export const HOLD_MINUTES = 10;

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/** Booking a mentoring or career session: hold → pay → (webhook) confirmed. */
@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BookingCatalogService,
    private readonly availability: AvailabilityService,
    private readonly providers: PaymentProviderRegistry,
    private readonly audit: AuditService,
  ) {}

  /**
   * Holds a free slot and creates the pending order. The amount comes from the
   * package in the database; the browser sends only ids (spec §9.5).
   */
  async hold(user: AuthUser, input: HoldBookingInput, client: ClientInfo): Promise<HoldResponse> {
    const { pkg, mentor } = await this.catalog.resolve(input.service, input.mentorId);
    const startAt = new Date(input.startAt);
    if (!(await this.availability.isFree(mentor.id, pkg.sessionMinutes, startAt))) {
      throw ApiException.conflict('slot.unavailable');
    }
    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);

    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        await this.releaseOldHolds(tx, user.id, mentor.id, startAt, now);
        const order = await tx.order.create({
          data: {
            userId: user.id,
            items: [
              { packageCode: pkg.code, sessions: pkg.sessions, priceAgorot: pkg.priceAgorot },
            ],
            amountAgorot: pkg.priceAgorot,
            provider: this.providers.current().name,
          },
        });
        await tx.consent.create({
          data: {
            userId: user.id,
            type: 'terms',
            textVersion: CURRENT_TERMS_CONSENT,
            text: CONSENT_TEXTS[CURRENT_TERMS_CONSENT][input.locale],
            ip: client.ip,
          },
        });
        return tx.booking.create({
          data: {
            userId: user.id,
            mentorId: mentor.id,
            packageId: pkg.id,
            startAt,
            endAt: new Date(startAt.getTime() + pkg.sessionMinutes * 60_000),
            holdExpiresAt,
            orderId: order.id,
          },
        });
      });
      await this.audit.record({
        actorId: user.id,
        action: 'booking.held',
        entity: 'booking',
        entityId: booking.id,
        after: { service: pkg.code, mentorId: mentor.id, startAt: startAt.toISOString() },
        client,
      });
      return { bookingId: booking.id, holdExpiresAt: holdExpiresAt.toISOString() };
    } catch (error) {
      // Someone else took the slot a moment earlier (unique index on mentor + start).
      if (isUniqueViolation(error)) throw ApiException.conflict('slot.unavailable');
      throw error;
    }
  }

  /** Redirect to the provider's hosted payment page; also used for "Try payment again". */
  async checkout(
    user: AuthUser,
    bookingId: string,
    locale: string,
  ): Promise<{ redirectUrl: string }> {
    const booking = await this.ownBooking(user, bookingId);
    const order = booking.order;
    if (!order || order.status === 'paid' || order.status === 'refunded') {
      throw ApiException.conflict('booking.alreadyPaid');
    }
    if (!liveHoldUntil(booking)) throw ApiException.conflict('booking.holdExpired');
    if (order.status === 'failed') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'pending', failureReason: null },
      });
    }
    return this.providers.current().createCheckout({
      orderId: order.id,
      bookingId: booking.id,
      amountAgorot: order.amountAgorot,
      currency: 'ILS',
      description: booking.package.code,
      locale,
      customerEmail: user.email,
    });
  }

  async view(user: AuthUser, bookingId: string): Promise<BookingView> {
    return toBookingView(await this.ownBooking(user, bookingId), user.locale);
  }

  /** Bookings are visible only to their owner; anyone else gets 404 (spec §9.2). */
  async ownBooking(user: AuthUser, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId: user.id },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw ApiException.notFound();
    return booking;
  }

  /**
   * Starting a new hold frees the person's earlier unpaid holds, and frees this
   * exact slot if someone's hold on it has expired.
   */
  private async releaseOldHolds(
    tx: Prisma.TransactionClient,
    userId: string,
    mentorId: string,
    startAt: Date,
    now: Date,
  ): Promise<Booking[]> {
    const stale = await tx.booking.findMany({
      where: {
        status: 'held',
        OR: [{ userId }, { mentorId, startAt, holdExpiresAt: { lte: now } }],
      },
    });
    if (stale.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: stale.map((b) => b.id) } },
        data: { status: 'cancelled', holdExpiresAt: null },
      });
    }
    return stale;
  }
}
