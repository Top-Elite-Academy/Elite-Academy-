import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/errors/api.exception';
import { AppConfig } from '../../config/app-config';
import type { PaymentProvider } from './payment-provider';
import { TestPaymentProvider } from './test-payment.provider';

/** PAYMENT_PROVIDER value that turns online payments off (no gateway connected yet). */
export const PAYMENTS_DISABLED = 'disabled';

/** The configured gateway (PAYMENT_PROVIDER). Add real providers here when chosen. */
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<string, PaymentProvider>;

  constructor(
    private readonly config: AppConfig,
    testProvider: TestPaymentProvider,
  ) {
    this.providers = new Map([[testProvider.name, testProvider]]);
  }

  /**
   * The provider new orders are paid with. With payments disabled, nothing can
   * be booked or paid, so no order is ever created.
   */
  current(): PaymentProvider {
    if (this.config.payments.provider === PAYMENTS_DISABLED) {
      throw ApiException.conflict('booking.paymentsUnavailable');
    }
    return this.get(this.config.payments.provider);
  }

  /** A provider by name (webhook URL); unknown names are a 404. */
  get(name: string): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider || name !== this.config.payments.provider) throw ApiException.notFound();
    return provider;
  }
}
