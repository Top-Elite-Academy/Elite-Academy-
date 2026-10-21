import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { BookingView, CheckoutResponse, HoldResponse, SlotInfo } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Public } from '../../common/authz/decorators';
import { ApiException } from '../../common/errors/api.exception';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { AvailabilityService } from './availability.service';
import { BookingCatalogService } from './booking-catalog.service';
import { CheckoutDto, HoldBookingDto, SlotsQueryDto } from './booking.dto';
import { BookingsService } from './bookings.service';
import { buildIcs } from './ics';

const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('booking')
@Controller()
export class BookingController {
  constructor(
    private readonly catalog: BookingCatalogService,
    private readonly availability: AvailabilityService,
    private readonly bookings: BookingsService,
  ) {}

  /** Free sessions of a mentor for a service over the next 14 days (spec §3.7 step 2). */
  @Public()
  @Get('booking/slots')
  async slots(@Query() query: SlotsQueryDto): Promise<SlotInfo[]> {
    const { pkg, mentor } = await this.catalog.resolve(query.service, query.mentorId);
    return this.availability.freeSlots(mentor.id, pkg.sessionMinutes);
  }

  /** Step 3 → 4: requires sign-in (spec §3.7); holds the slot for 10 minutes. */
  @Post('bookings/hold')
  hold(
    @CurrentUser() user: AuthUser,
    @Body() body: HoldBookingDto,
    @Client() client: ClientInfo,
  ): Promise<HoldResponse> {
    return this.bookings.hold(user, body, client);
  }

  /** Redirect to the provider's hosted payment page (also "Try payment again"). */
  @Post('bookings/:id/checkout')
  @HttpCode(HttpStatus.OK)
  checkout(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: CheckoutDto,
  ): Promise<CheckoutResponse> {
    return this.bookings.checkout(user, id, body.locale);
  }

  @Get('bookings/:id')
  view(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<BookingView> {
    return this.bookings.view(user, id);
  }

  /** "Add to calendar" (spec §3.7 step 5), only for a confirmed booking. */
  @Get('bookings/:id/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="elite-tech-session.ics"')
  async calendar(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<string> {
    const booking = await this.bookings.view(user, id);
    if (booking.status !== 'confirmed') throw ApiException.notFound();
    return buildIcs({
      uid: booking.id,
      startAt: new Date(booking.startAt),
      endAt: new Date(booking.endAt),
      title: `Elite Tech Academy — ${booking.mentor.name}`,
      description: 'The meeting link is in your Elite Tech Academy dashboard.',
    });
  }
}
