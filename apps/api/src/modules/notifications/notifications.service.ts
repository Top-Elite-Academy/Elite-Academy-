import { Injectable } from '@nestjs/common';
import type { Notification } from '@eta/db';
import type { NotificationsResponse, NotificationView } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from './realtime.service';

const LIST_LIMIT = 20;

type NotificationInput = Pick<NotificationView, 'type' | 'data'>;

export const toNotificationView = (row: Notification): NotificationView =>
  ({
    id: row.id,
    type: row.type,
    data: row.data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }) as NotificationView;

/** The notification bell: stored first, then pushed live to open tabs. */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Stores one notification per user and pushes it to everyone who is online. */
  async notify(userIds: string[], notification: NotificationInput): Promise<void> {
    if (userIds.length === 0) return;
    const rows = await this.prisma.notification.createManyAndReturn({
      data: userIds.map((userId) => ({
        userId,
        type: notification.type,
        data: notification.data,
      })),
    });
    await Promise.all(
      rows.map((row) =>
        this.realtime.publish(row.userId, {
          kind: 'notification',
          notification: toNotificationView(row),
        }),
      ),
    );
  }

  async list(user: AuthUser): Promise<NotificationsResponse> {
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return { items: rows.map(toNotificationView), unread };
  }

  /** Marks the given notifications (or all) as read — only the user's own. */
  async markRead(user: AuthUser, ids?: string[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
  }
}
