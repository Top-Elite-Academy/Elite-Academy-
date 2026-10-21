import { Injectable } from '@nestjs/common';
import { localize } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';
import { MailService } from '../mail/mail.service';

/**
 * Tells the booker their session is confirmed (spec §3.7). Email now; WhatsApp
 * and the tax receipt are added with those integrations.
 */
@Injectable()
export class BookingNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: AppConfig,
  ) {}

  async bookingConfirmed(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { user: true, mentor: true },
    });
    const { user } = booking;
    const when = new Intl.DateTimeFormat(user.locale, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: user.timeZone,
      numberingSystem: 'latn',
    }).format(booking.startAt);
    const zoneName =
      new Intl.DateTimeFormat(user.locale, { timeZone: user.timeZone, timeZoneName: 'long' })
        .formatToParts(booking.startAt)
        .find((part) => part.type === 'timeZoneName')?.value ?? user.timeZone;

    await this.mail.send({
      to: user.email,
      locale: user.locale,
      template: 'bookingConfirmed',
      params: {
        firstName: user.firstName,
        mentorName: localize(booking.mentor.name, user.locale),
        when,
        timeZone: zoneName,
        link: `${this.config.http.webOrigin}/${user.locale}/app`,
      },
    });
  }
}
