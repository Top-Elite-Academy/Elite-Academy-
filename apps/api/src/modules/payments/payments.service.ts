import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@eta/db';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PaymentNotification } from './payment-provider';
import { PaymentProviderRegistry } from './payment-provider.registry';

export type PaymentResult =
  | { kind: 'ignored' }
  | { kind: 'failed'; orderId: string }
  | { kind: 'paid'; orderId: string; bookingId: string | null; confirmed: boolean };

/**
 * Applies provider webhooks (spec §9.5): an order becomes "paid" only here,
 * after the signature, amount, currency and order id are checked; the same
 * event twice does nothing.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly audit: AuditService,
  ) {}

  async handleWebhook(
    providerName: string,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    client: ClientInfo,
  ): Promise<PaymentResult> {
    const provider = this.providers.get(providerName);
    const notification = provider.verifyWebhook(rawBody, headers);
    if (!notification) {
      await this.audit.record({
        actorId: null,
        action: 'payment.webhook.badSignature',
        entity: 'order',
        client,
      });
      throw ApiException.badRequest('payment.invalidSignature');
    }
    const result = await this.prisma.$transaction((tx) =>
      this.apply(tx, provider.name, notification),
    );
    if (result.kind !== 'ignored') {
      await this.audit.record({
        actorId: null,
        action: `payment.${result.kind}`,
        entity: 'order',
        entityId: result.orderId,
        after: { provider: provider.name, eventId: notification.eventId },
        client,
      });
    }
    return result;
  }

  private async apply(
    tx: Prisma.TransactionClient,
    provider: string,
    event: PaymentNotification,
  ): Promise<PaymentResult> {
    if (!(await this.recordEventOnce(tx, provider, event))) return { kind: 'ignored' };

    const order = await this.matchingOrder(tx, provider, event);
    if (order.status === 'paid' || order.status === 'refunded') return { kind: 'ignored' };

    if (event.outcome === 'failed') {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'failed', failureReason: event.failureReason ?? 'failed' },
      });
      return { kind: 'failed', orderId: order.id };
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'paid',
        providerTxnId: event.providerTxnId,
        paidAt: new Date(),
        failureReason: null,
      },
    });
    const booking = order.bookings[0];
    const confirmed = booking ? await this.confirmBooking(tx, booking.id) : false;
    return { kind: 'paid', orderId: order.id, bookingId: booking?.id ?? null, confirmed };
  }

  /** The order the event is about; its provider, amount and currency must match exactly. */
  private async matchingOrder(
    tx: Prisma.TransactionClient,
    provider: string,
    event: PaymentNotification,
  ) {
    const order = await tx.order.findUnique({
      where: { id: event.orderId },
      include: { bookings: true },
    });
    if (order?.provider !== provider) throw ApiException.badRequest('payment.unknownOrder');
    if (event.amountAgorot !== order.amountAgorot || event.currency !== order.currency) {
      this.logger.error(`Payment amount mismatch on order ${order.id}`);
      throw ApiException.badRequest('payment.amountMismatch');
    }
    return order;
  }

  /** False when this provider event was already processed. */
  private async recordEventOnce(
    tx: Prisma.TransactionClient,
    provider: string,
    event: PaymentNotification,
  ) {
    try {
      await tx.paymentEvent.create({
        data: { provider, eventId: event.eventId, orderId: event.orderId, type: event.outcome },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        return false;
      throw error;
    }
  }

  /**
   * Held → confirmed. A multi-session package (8-session plan) also gets its
   * credits, the first one used by this booking (spec §3.7).
   */
  private async confirmBooking(tx: Prisma.TransactionClient, bookingId: string): Promise<boolean> {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { package: true },
    });
    if (booking.status !== 'held') {
      // The hold expired and the slot was released before the payment arrived: needs a manual refund.
      this.logger.warn(`Paid after hold expired: booking ${booking.id}`);
      return false;
    }
    const credit =
      booking.package.sessions > 1
        ? await tx.packageCredit.create({
            data: {
              userId: booking.userId,
              packageId: booking.packageId,
              orderId: booking.orderId,
              mentorId: booking.mentorId,
              total: booking.package.sessions,
              used: 1,
            },
          })
        : null;
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: 'confirmed', holdExpiresAt: null, creditId: credit?.id ?? null },
    });
    return true;
  }
}
