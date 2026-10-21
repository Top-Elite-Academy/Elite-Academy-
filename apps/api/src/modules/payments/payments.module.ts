import { Module } from '@nestjs/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { PaymentsService } from './payments.service';
import { TestPaymentProvider } from './test-payment.provider';

/** Payment gateway adapters and webhook processing (spec §8, §9.5). */
@Module({
  providers: [TestPaymentProvider, PaymentProviderRegistry, PaymentsService],
  exports: [TestPaymentProvider, PaymentProviderRegistry, PaymentsService],
})
export class PaymentsModule {}
