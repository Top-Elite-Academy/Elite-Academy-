import { createHmac, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AppConfig } from '../../config/app-config';
import {
  type CheckoutRequest,
  type PaymentNotification,
  PaymentProvider,
} from './payment-provider';

export const TEST_SIGNATURE_HEADER = 'x-test-signature';

const notificationSchema = z.object({
  eventId: z.string().min(1).max(100),
  orderId: z.uuid(),
  outcome: z.enum(['paid', 'failed']),
  amountAgorot: z.number().int(),
  currency: z.string().length(3),
  providerTxnId: z.string().min(1).max(100),
  failureReason: z.string().max(200).optional(),
});

/**
 * Development-only stand-in for a real gateway (refused in production by the
 * env schema). Its "hosted page" is a test screen in the web app; its webhooks
 * are HMAC-signed exactly like a real provider's, so the same verification,
 * amount checks and idempotency run.
 */
@Injectable()
export class TestPaymentProvider extends PaymentProvider {
  readonly name = 'test';

  constructor(
    private readonly config: AppConfig,
    private readonly crypto: CryptoService,
  ) {
    super();
  }

  createCheckout(request: CheckoutRequest): Promise<{ redirectUrl: string }> {
    const url = new URL(`/${request.locale}/book/test-checkout`, this.config.http.webOrigin);
    url.searchParams.set('booking', request.bookingId);
    return Promise.resolve({ redirectUrl: url.toString() });
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): PaymentNotification | null {
    const signature = headers[TEST_SIGNATURE_HEADER];
    if (typeof signature !== 'string' || !this.crypto.safeEqual(signature, this.sign(rawBody))) {
      return null;
    }
    try {
      const parsed = notificationSchema.safeParse(JSON.parse(rawBody.toString('utf8')));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /** What the test checkout screen "sends back", signed like a provider would. */
  buildNotification(
    order: { id: string; amountAgorot: number; currency: string },
    outcome: 'paid' | 'failed',
  ) {
    const notification: PaymentNotification = {
      eventId: randomUUID(),
      orderId: order.id,
      outcome,
      amountAgorot: order.amountAgorot,
      currency: order.currency,
      providerTxnId: `test_${randomUUID()}`,
      ...(outcome === 'failed' ? { failureReason: 'card_declined' } : {}),
    };
    const rawBody = Buffer.from(JSON.stringify(notification));
    return { rawBody, headers: { [TEST_SIGNATURE_HEADER]: this.sign(rawBody) } };
  }

  sign(rawBody: Buffer): string {
    return createHmac('sha256', this.config.payments.testSecret).update(rawBody).digest('hex');
  }
}
