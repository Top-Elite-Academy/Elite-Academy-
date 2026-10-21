import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import {
  localize,
  type SessionsScope,
  type StudentOrder,
  type StudentOverview,
  type StudentPackage,
  type StudentSession,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ORDER_INCLUDE, SESSION_INCLUDE, toStudentOrder, toStudentSession } from './student.mapper';

const LIST_LIMIT = 50;
const OVERVIEW_SESSIONS = 3;

/**
 * Read-only views of the signed-in student's own sessions, plans and orders
 * (spec §4.3–4.6). Every query is filtered by the student's id.
 */
@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser): Promise<StudentOverview> {
    const [upcoming, packages] = await Promise.all([
      this.sessions(user, 'upcoming', OVERVIEW_SESSIONS),
      this.packages(user),
    ]);
    return { upcoming, packages };
  }

  async sessions(
    user: AuthUser,
    scope: SessionsScope,
    take = LIST_LIMIT,
  ): Promise<StudentSession[]> {
    const now = new Date();
    const bookings = await this.prisma.booking.findMany({
      where: { userId: user.id, ...(scope === 'upcoming' ? upcoming(now) : past(now)) },
      include: SESSION_INCLUDE,
      orderBy: { startAt: scope === 'upcoming' ? 'asc' : 'desc' },
      take,
    });
    return bookings.map((booking) => toStudentSession(booking, user.locale, now));
  }

  async packages(user: AuthUser): Promise<StudentPackage[]> {
    const now = new Date();
    const credits = await this.prisma.packageCredit.findMany({
      where: { userId: user.id },
      include: {
        package: true,
        bookings: {
          where: { status: 'confirmed', startAt: { gt: now } },
          orderBy: { startAt: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const mentorIds = credits.flatMap((credit) => (credit.mentorId ? [credit.mentorId] : []));
    const mentors = await this.prisma.mentorProfile.findMany({ where: { id: { in: mentorIds } } });

    return credits.map((credit) => {
      const mentor = mentors.find((item) => item.id === credit.mentorId);
      return {
        id: credit.id,
        service: credit.package.code,
        mentor: mentor ? { id: mentor.id, name: localize(mentor.name, user.locale) } : null,
        total: credit.total,
        used: credit.used,
        nextSessionAt: credit.bookings[0]?.startAt.toISOString() ?? null,
      };
    });
  }

  /** Paid, failed and refunded orders; an unfinished checkout is not an order yet. */
  async orders(user: AuthUser): Promise<StudentOrder[]> {
    const now = new Date();
    const orders = await this.prisma.order.findMany({
      where: { userId: user.id, status: { not: 'pending' } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
    return orders.map((order) => toStudentOrder(order, now));
  }
}

const upcoming = (now: Date): Prisma.BookingWhereInput => ({
  status: 'confirmed',
  endAt: { gt: now },
});

/** Sessions that happened or were cancelled after paying. Abandoned holds never show. */
const past = (now: Date): Prisma.BookingWhereInput => ({
  OR: [
    { status: { in: ['completed', 'no_show'] } },
    { status: 'confirmed', endAt: { lte: now } },
    {
      status: 'cancelled',
      OR: [{ creditId: { not: null } }, { order: { status: { in: ['paid', 'refunded'] } } }],
    },
  ],
});
