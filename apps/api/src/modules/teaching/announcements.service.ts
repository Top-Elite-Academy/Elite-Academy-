import { Injectable } from '@nestjs/common';
import type { AnnouncementInput, AnnouncementView } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ANNOUNCEMENT_INCLUDE, toAnnouncementView } from './teaching.mapper';
import { TeachingService } from './teaching.service';

const LIST_LIMIT = 50;

/** Cohort announcements: posted by the instructor, pushed to every confirmed student. */
@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teaching: TeachingService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async post(
    user: AuthUser,
    cohortId: string,
    input: AnnouncementInput,
    client: ClientInfo,
  ): Promise<AnnouncementView> {
    const cohort = await this.teaching.cohortRecord(user, cohortId);
    const announcement = await this.prisma.announcement.create({
      data: { cohortId, authorId: user.id, title: input.title, body: input.body },
      include: ANNOUNCEMENT_INCLUDE,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'announcement.posted',
      entity: 'announcement',
      entityId: announcement.id,
      after: { cohortId, title: input.title },
      client,
    });

    // Only confirmed students: a pending request does not unlock the class yet.
    const students = await this.prisma.enrollment.findMany({
      where: { cohortId, status: 'confirmed' },
      select: { userId: true },
    });
    await this.notifications.notify(
      students.map((student) => student.userId),
      {
        type: 'announcement',
        data: {
          cohortId,
          cohortName: cohort.name,
          title: announcement.title,
          announcementId: announcement.id,
        },
      },
    );
    return toAnnouncementView(announcement);
  }

  async list(user: AuthUser, cohortId: string): Promise<AnnouncementView[]> {
    await this.teaching.cohortRecord(user, cohortId);
    const rows = await this.prisma.announcement.findMany({
      where: { cohortId },
      include: ANNOUNCEMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
    return rows.map(toAnnouncementView);
  }
}
