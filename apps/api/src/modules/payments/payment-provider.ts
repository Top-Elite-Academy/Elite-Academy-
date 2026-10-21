/**
 * Payment gateway adapter (spec §8: one small adapter per outside service).
 * The platform never sees card data: the provider hosts the payment page and
 * reports the result through a signed webhook (spec §9.5, PCI SAQ A).
 * Cardcom / Tranzila / Grow will implement this same interface.
 */

export interface CheckoutRequest {
  orderId: string;
  bookingId: string;
  amountAgorot: number;
  currency: 'ILS';
  description: string;
  locale: string;
  customerEmail: string;
}

/** A verified provider notification about one order. */
export interface PaymentNotification {
  /** Provider's unique event id — used to ignore duplicates. */
  eventId: string;
  orderId: string;
  outcome: 'paid' | 'failed';
  amountAgorot: number;
  currency: string;
  providerTxnId: string;
  failureReason?: string;
}

export abstract class PaymentProvider {
  abstract readonly name: string;

  /** URL of the provider's hosted payment page for this order. */
  abstract createCheckout(request: CheckoutRequest): Promise<{ redirectUrl: string }>;

  /** Returns the notification only if the signature is valid; null otherwise. */
  abstract verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): PaymentNotification | null;
}
