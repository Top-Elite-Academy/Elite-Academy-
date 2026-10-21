import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Public, SkipCsrf } from '../../common/authz/decorators';
import { ApiException } from '../../common/errors/api.exception';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { AppConfig } from '../../config/app-config';
import { type PaymentResult, PaymentsService } from '../payments/payments.service';
import { TestPaymentProvider } from '../payments/test-payment.provider';
import { BookingNotificationsService } from './booking-notifications.service';
import { TestPaymentDto } from './booking.dto';
import { BookingsService } from './bookings.service';

/** Provider → platform: the only way an order becomes "paid" (spec §3.7, §9.5). */
@ApiTags('payments')
@Controller()
export class PaymentWebhooksController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly notifications: BookingNotificationsService,
    private readonly bookings: BookingsService,
    private readonly testProvider: TestPaymentProvider,
    private readonly config: AppConfig,
  ) {}

  /** Server-to-server: no session or CSRF token; trust comes from the signature. */
  @Public()
  @SkipCsrf()
  @Post('payments/webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') provider: string,
    @Req() request: RawBodyRequest<Request>,
    @Client() client: ClientInfo,
  ): Promise<{ received: true }> {
    if (!request.rawBody) throw ApiException.badRequest('payment.invalidSignature');
    await this.afterPayment(
      await this.payments.handleWebhook(provider, request.rawBody, request.headers, client),
    );
    return { received: true };
  }

  /**
   * Development only: the test provider's "hosted page" asks it to send a signed
   * webhook for the booker's own order, which then goes through the same checks.
   */
  @Post('bookings/:id/test-payment')
  @HttpCode(HttpStatus.OK)
  async testPayment(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TestPaymentDto,
    @Client() client: ClientInfo,
  ): Promise<{ received: true }> {
    if (this.config.payments.provider !== 'test') throw ApiException.notFound();
    const booking = await this.bookings.ownBooking(user, id);
    if (!booking.order) throw ApiException.notFound();
    const { rawBody, headers } = this.testProvider.buildNotification(booking.order, body.outcome);
    await this.afterPayment(await this.payments.handleWebhook('test', rawBody, headers, client));
    return { received: true };
  }

  private async afterPayment(result: PaymentResult): Promise<void> {
    if (result.kind === 'paid' && result.confirmed && result.bookingId) {
      await this.notifications.bookingConfirmed(result.bookingId);
    }
  }
}
