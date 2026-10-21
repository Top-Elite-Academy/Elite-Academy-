import { Injectable } from '@nestjs/common';
import type { SlotInfo } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { generateSlots } from './slot-generator';

/** Spec §3.7: days offered and how soon the earliest session may start. */
export const BOOKING_DAYS = 14;
const MIN_LEAD_MS = 3 * 60 * 60 * 1000;

/** Free sessions of a mentor: weekly availability minus active bookings and live holds. */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async freeSlots(mentorId: string, sessionMinutes: number, now = new Date()): Promise<SlotInfo[]> {
    const windows = await this.prisma.availabilitySlot.findMany({ where: { mentorId } });
    if (windows.length === 0) return [];

    const until = new Date(now.getTime() + (BOOKING_DAYS + 1) * 24 * 60 * 60 * 1000);
    const busy = await this.prisma.booking.findMany({
      where: {
        mentorId,
        startAt: { lt: until },
        endAt: { gt: now },
        OR: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { gt: now } }],
      },
      select: { startAt: true, endAt: true },
    });

    return generateSlots({
      windows,
      sessionMinutes,
      now,
      days: BOOKING_DAYS,
      earliest: new Date(now.getTime() + MIN_LEAD_MS),
      busy,
    });
  }

  /** The exact start must be one of the free slots — the browser's choice is never trusted. */
  async isFree(mentorId: string, sessionMinutes: number, startAt: Date): Promise<boolean> {
    const slots = await this.freeSlots(mentorId, sessionMinutes);
    const wanted = startAt.toISOString();
    return slots.some((slot) => slot.startAt === wanted);
  }
}
