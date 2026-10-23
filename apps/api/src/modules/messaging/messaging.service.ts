import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import {
  type ConversationFilter,
  type ConversationList,
  type ConversationSummary,
  type ConversationThread,
  type MessageEvent,
  type StartConversationInput,
  UNREAD_EMAIL_MINUTES,
} from '@eta/shared';
import type { Queue } from 'bullmq';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorage } from '../../common/files/file-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { ReceivedFile } from '../lessons/lesson-files.service';
import { RealtimeService } from '../notifications/realtime.service';
import { MessageAttachmentsService } from './message-attachments.service';
import { TEAM_ROLES, threadScope } from './messaging-access';
import {
  CONVERSATION_INCLUDE,
  type ConversationRecord,
  MESSAGE_INCLUDE,
  toMessageView,
  toSummaryBase,
} from './messaging.mapper';
import { RecipientsService } from './recipients.service';

export const MESSAGE_EMAIL_QUEUE = 'message-email';
export interface MessageEmailJob {
  messageId: string;
}

const LIST_LIMIT = 50;
const THREAD_LIMIT = 200;
/** Download links work for a few minutes only. */
const DOWNLOAD_SECONDS = 5 * 60;

/**
 * Messages & support (spec §4.9). Every query is limited to the user's own
 * threads (or their team's inbox), so ids from the URL never reveal others.
 */
@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recipients: RecipientsService,
    private readonly attachments: MessageAttachmentsService,
    private readonly realtime: RealtimeService,
    private readonly storage: FileStorage,
    @InjectQueue(MESSAGE_EMAIL_QUEUE) private readonly emailQueue: Queue<MessageEmailJob>,
  ) {}

  async list(user: AuthUser, query: ConversationFilter): Promise<ConversationList> {
    const search: Prisma.ConversationWhereInput = query.q
      ? {
          OR: [
            { subject: { contains: query.q, mode: 'insensitive' } },
            { student: { firstName: { contains: query.q, mode: 'insensitive' } } },
            { student: { lastName: { contains: query.q, mode: 'insensitive' } } },
            { staff: { firstName: { contains: query.q, mode: 'insensitive' } } },
            { staff: { lastName: { contains: query.q, mode: 'insensitive' } } },
            { messages: { some: { body: { contains: query.q, mode: 'insensitive' } } } },
          ],
        }
      : {};
    const conversations = await this.prisma.conversation.findMany({
      where: { AND: [threadScope(user), search] },
      include: {
        ...CONVERSATION_INCLUDE,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        reads: { where: { userId: user.id } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: LIST_LIMIT,
    });
    const items = await Promise.all(
      conversations.map(async (conversation): Promise<ConversationSummary> => {
        const [last] = conversation.messages;
        return {
          ...toSummaryBase(user, conversation),
          lastMessage: last
            ? {
                body: last.body,
                fromMe: last.senderId === user.id,
                createdAt: last.createdAt.toISOString(),
              }
            : null,
          unread: await this.unreadIn(user, conversation.id, conversation.reads[0]?.lastReadAt),
        };
      }),
    );
    const shown = query.filter === 'unread' ? items.filter((item) => item.unread > 0) : items;
    return { items: shown, unread: await this.unreadCount(user) };
  }

  private unreadIn(user: AuthUser, conversationId: string, lastReadAt: Date | undefined) {
    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: user.id },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });
  }

  /** Threads with something new for the user (the sidebar badge). */
  async unreadCount(user: AuthUser): Promise<number> {
    const conversations = await this.prisma.conversation.findMany({
      where: threadScope(user),
      select: { id: true, reads: { where: { userId: user.id } } },
    });
    const counts = await Promise.all(
      conversations.map((item) => this.unreadIn(user, item.id, item.reads[0]?.lastReadAt)),
    );
    return counts.filter((count) => count > 0).length;
  }

  /** One of the user's threads, or 404. */
  private async conversation(user: AuthUser, id: string): Promise<ConversationRecord> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { AND: [{ id }, threadScope(user)] },
      include: CONVERSATION_INCLUDE,
    });
    if (!conversation) throw ApiException.notFound();
    return conversation;
  }

  /** The thread's messages; opening it marks it read. */
  async thread(user: AuthUser, id: string): Promise<ConversationThread> {
    const conversation = await this.conversation(user, id);
    const [messages, othersRead] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: id },
        include: MESSAGE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: THREAD_LIMIT,
      }),
      this.prisma.conversationRead.findFirst({
        where: { conversationId: id, userId: { not: user.id } },
        orderBy: { lastReadAt: 'desc' },
      }),
    ]);
    await this.markRead(user, id);
    return {
      ...toSummaryBase(user, conversation),
      messages: messages.reverse().map((message) => toMessageView(user, message)),
      readByOthersAt: othersRead?.lastReadAt.toISOString() ?? null,
    };
  }

  async markRead(user: AuthUser, id: string): Promise<void> {
    const now = new Date();
    await this.prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId: id, userId: user.id } },
      create: { conversationId: id, userId: user.id, lastReadAt: now },
      update: { lastReadAt: now },
    });
  }

  /** "New message": finds or opens the thread with an allowed recipient and sends the first message. */
  async start(user: AuthUser, input: StartConversationInput): Promise<{ id: string }> {
    const recipient = await this.recipients.allows(user, input.to);
    if (!recipient) throw ApiException.notFound();
    const asStudent = user.roles.includes('student');
    const where: Prisma.ConversationWhereInput =
      recipient.kind === 'team'
        ? { studentId: user.id, kind: recipient.team, staffId: null }
        : asStudent
          ? { studentId: user.id, kind: 'direct', staffId: recipient.userId }
          : { studentId: recipient.userId, kind: 'direct', staffId: user.id };
    const existing = await this.prisma.conversation.findFirst({ where });
    const conversation =
      existing ??
      (await this.prisma.conversation.create({
        data: {
          kind: recipient.kind === 'team' ? recipient.team : 'direct',
          studentId: recipient.kind === 'person' && !asStudent ? recipient.userId : user.id,
          staffId: recipient.kind === 'team' ? null : asStudent ? recipient.userId : user.id,
          subject: input.subject,
        },
      }));
    await this.send(user, conversation.id, input.body, []);
    return { id: conversation.id };
  }

  async send(
    user: AuthUser,
    id: string,
    body: string,
    files: ReceivedFile[],
  ): Promise<ConversationThread> {
    try {
      const conversation = await this.conversation(user, id);
      if (!body && files.length === 0) throw ApiException.badRequest('message.required');
      const checked = this.attachments.check(files);
      const message = await this.prisma.message.create({
        data: { conversationId: id, senderId: user.id, body },
      });
      for (const file of checked) await this.attachments.store(message.id, file);
      await this.prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: message.createdAt },
      });
      await this.markRead(user, id);
      await this.tellOthers(user, conversation, message.id);
      return await this.thread(user, id);
    } finally {
      await this.attachments.cleanUp(files);
    }
  }

  /** Live update for everyone else in the thread, and an email if it stays unread. */
  private async tellOthers(
    user: AuthUser,
    conversation: ConversationRecord,
    messageId: string,
  ): Promise<void> {
    const teamMembers =
      conversation.kind === 'direct'
        ? []
        : await this.prisma.user.findMany({
            where: {
              deletedAt: null,
              roles: { some: { role: { in: TEAM_ROLES[conversation.kind] } } },
            },
            select: { id: true },
          });
    const others = new Set(
      [
        conversation.studentId,
        conversation.staffId,
        ...teamMembers.map((member) => member.id),
      ].filter((userId): userId is string => userId !== null && userId !== user.id),
    );
    const event: MessageEvent = { kind: 'message', conversationId: conversation.id, messageId };
    await Promise.all([...others].map((userId) => this.realtime.publish(userId, event)));
    await this.emailQueue.add(
      'unread',
      { messageId },
      {
        delay: UNREAD_EMAIL_MINUTES * 60_000,
        jobId: `message-${messageId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  /** A short-lived link to a clean attachment in one of the user's threads. */
  async attachmentUrl(user: AuthUser, attachmentId: string): Promise<string> {
    const attachment = await this.prisma.messageAttachment.findFirst({
      where: {
        id: attachmentId,
        scanStatus: 'clean',
        message: { conversation: threadScope(user) },
      },
    });
    if (!attachment) throw ApiException.notFound();
    return this.storage.signedUrl(attachment.storageKey, {
      expiresInSeconds: DOWNLOAD_SECONDS,
      download: attachment.fileName,
    });
  }
}
