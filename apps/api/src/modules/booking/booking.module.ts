import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { AvailabilityService } from './availability.service';
import { BookingCatalogService } from './booking-catalog.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { BookingController } from './booking.controller';
import { BookingsService } from './bookings.service';
import { PaymentWebhooksController } from './payment-webhooks.controller';

/** Mentoring and career advice bookings (milestone 5, spec §3.7). */
@Module({
  imports: [PaymentsModule],
  controllers: [BookingController, PaymentWebhooksController],
  providers: [
    AvailabilityService,
    BookingCatalogService,
    BookingsService,
    BookingNotificationsService,
  ],
})
export class BookingModule {}
