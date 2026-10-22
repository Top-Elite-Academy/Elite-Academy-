import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { AvailabilityService } from './availability.service';
import { BookingCatalogService } from './booking-catalog.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { BookingController } from './booking.controller';
import { BookingsService } from './bookings.service';
import { MentorScheduleService } from './mentor-schedule.service';
import { MySessionsController } from './my-sessions.controller';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { SessionChangesService } from './session-changes.service';
import { TeachSessionsController } from './teach-sessions.controller';

/** Mentoring and career advice bookings (milestone 5, spec §3.7). */
@Module({
  imports: [PaymentsModule],
  controllers: [
    BookingController,
    PaymentWebhooksController,
    TeachSessionsController,
    MySessionsController,
  ],
  providers: [
    AvailabilityService,
    BookingCatalogService,
    BookingsService,
    BookingNotificationsService,
    SessionChangesService,
    MentorScheduleService,
  ],
})
export class BookingModule {}
