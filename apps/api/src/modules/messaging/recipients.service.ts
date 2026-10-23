import { Injectable } from '@nestjs/common';
import { localize, type Recipient } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { PrismaService } from '../../common/prisma/prisma.service';

const STAFF_ROLES = ['instructor', 'mentor'] as const;

/**
 * Who the user may start a thread with (spec §4.9 "choose recipient from the
 * allowed list"). Students: the instructors of their programs, the mentors
 * they booked, Support and Payments. Instructors and mentors: their students.
 */
@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser): Promise<Recipient[]> {
    const lists: Recipient[][] = [];
    if (user.roles.includes('student')) lists.push(await this.forStudent(user));
    if (STAFF_ROLES.some((role) => user.roles.includes(role)))
      lists.push(await this.forStaff(user));
    // A person reachable for two reasons appears once.
    const seen = new Set<string>();
    return lists.flat().filter((recipient) => {
      const key = recipient.kind === 'team' ? recipient.team : recipient.userId;
      if (seen.has(key) || key === user.id) return false;
      seen.add(key);
      return true;
    });
  }

  /** True when the user may start a thread with this person or team. */
  async allows(user: AuthUser, to: string): Promise<Recipient | null> {
    const recipients = await this.list(user);
    return (
      recipients.find((recipient) =>
        recipient.kind === 'team' ? recipient.team === to : recipient.userId === to,
      ) ?? null
    );
  }

  private async forStudent(user: AuthUser): Promise<Recipient[]> {
    const [enrollments, bookings] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId: user.id, status: 'confirmed' },
        include: {
          cohort: {
            include: {
              program: { include: { instructor: { include: { user: true } } } },
            },
          },
        },
      }),
      this.prisma.booking.findMany({
        where: { userId: user.id, status: { in: ['confirmed', 'completed'] } },
        include: { mentor: { include: { user: true } } },
      }),
    ]);
    const instructors = enrollments.flatMap(({ cohort }): Recipient[] => {
      const person = cohort.program.instructor?.user;
      return person && !person.deletedAt
        ? [
            {
              kind: 'person',
              userId: person.id,
              firstName: person.firstName,
              lastName: person.lastName,
              context: `${localize(cohort.program.title, user.locale)} · ${cohort.name}`,
            },
          ]
        : [];
    });
    const mentors = bookings.flatMap(({ mentor }): Recipient[] =>
      mentor.user && !mentor.user.deletedAt
        ? [
            {
              kind: 'person',
              userId: mentor.user.id,
              firstName: mentor.user.firstName,
              lastName: mentor.user.lastName,
              context: localize(mentor.role, user.locale),
            },
          ]
        : [],
    );
    return [
      ...instructors,
      ...mentors,
      { kind: 'team', team: 'support' },
      { kind: 'team', team: 'payments' },
    ];
  }

  private async forStaff(user: AuthUser): Promise<Recipient[]> {
    const [enrollments, bookings] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { status: 'confirmed', cohort: { program: { instructor: { userId: user.id } } } },
        include: { user: true, cohort: true },
        orderBy: { user: { firstName: 'asc' } },
      }),
      this.prisma.booking.findMany({
        where: { mentor: { userId: user.id }, status: { in: ['confirmed', 'completed'] } },
        include: { user: true },
      }),
    ]);
    return [
      ...enrollments.map(({ user: student, cohort }): Recipient => ({
        kind: 'person',
        userId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        context: cohort.name,
      })),
      ...bookings.map(({ user: student }): Recipient => ({
        kind: 'person',
        userId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        context: '',
      })),
    ].filter((recipient) => recipient.kind === 'person' && recipient.userId !== user.id);
  }
}
