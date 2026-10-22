import { Injectable } from '@nestjs/common';
import { cohortScheduleSchema, type SlotInfo } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { jerusalemToday } from '../../common/time/cohort-calendar';
import { liveClassTimes, timeOffTimes, withBreak } from './busy-times';
import { generateSlots } from './slot-generator';

/** Spec §3.7: days offered for booking. */
export const BOOKING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Free sessions of a mentor: weekly availability minus booked sessions (with
 * the mentor's break), live classes of their cohorts and days off; nothing
 * sooner than the mentor's minimum notice.
 */
@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async freeSlots(mentorId: string, sessionMinutes: number, now = new Date()): Promise<SlotInfo[]> {
    const today = jerusalemToday(now);
    const mentor = await this.prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      include: {
        availability: true,
        timeOff: { where: { endDate: { gte: new Date(`${today}T00:00:00Z`) } } },
      },
    });
    if (!mentor || mentor.availability.length === 0) return [];

    const until = new Date(now.getTime() + (BOOKING_DAYS + 1) * DAY_MS);
    const [bookings, cohorts] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          mentorId,
          startAt: { lt: until },
          endAt: { gt: now },
          OR: [{ status: 'confirmed' }, { status: 'held', holdExpiresAt: { gt: now } }],
        },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.cohort.findMany({
        where: { program: { instructorId: mentorId }, status: { not: 'finished' } },
        include: { program: { select: { lengthWeeks: true } } },
      }),
    ]);

    const scheduled = cohorts.flatMap((cohort) => {
      const schedule = cohortScheduleSchema.safeParse(cohort.schedule);
      return schedule.success
        ? [
            {
              startDate: isoDate(cohort.startDate),
              lengthWeeks: cohort.program.lengthWeeks,
              schedule: schedule.data,
            },
          ]
        : [];
    });

    return generateSlots({
      windows: mentor.availability,
      sessionMinutes,
      now,
      days: BOOKING_DAYS,
      earliest: new Date(now.getTime() + mentor.minNoticeHours * 60 * 60 * 1000),
      busy: [
        ...withBreak(bookings, mentor.breakMinutes),
        ...liveClassTimes(scheduled, today, BOOKING_DAYS + 1, mentor.breakMinutes),
        ...timeOffTimes(
          mentor.timeOff.map((range) => ({
            startDate: isoDate(range.startDate),
            endDate: isoDate(range.endDate),
          })),
        ),
      ],
    });
  }

  /** The exact start must be one of the free slots — the browser's choice is never trusted. */
  async isFree(mentorId: string, sessionMinutes: number, startAt: Date): Promise<boolean> {
    const slots = await this.freeSlots(mentorId, sessionMinutes);
    const wanted = startAt.toISOString();
    return slots.some((slot) => slot.startAt === wanted);
  }
}
