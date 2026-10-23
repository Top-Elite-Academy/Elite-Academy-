import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';
import { MailService } from '../mail/mail.service';
import { MESSAGE_EMAIL_QUEUE, type MessageEmailJob } from './messaging.service';

/**
 * "New messages notify by email if unread for 30 minutes" (spec §4.9). Runs
 * 30 minutes after a message; emails the student or the staff member of the
 * thread if they still haven't read it. Only the latest message of a thread
 * sends one, so a conversation does not flood the inbox. Team inboxes are
 * checked in the app, not by email.
 */
@Processor(MESSAGE_EMAIL_QUEUE)
export class UnreadEmailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: AppConfig,
  ) {
    super();
  }

  async process(job: Job<MessageEmailJob>): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: job.data.messageId },
      include: {
        sender: true,
        conversation: { include: { student: true, staff: true, reads: true } },
      },
    });
    if (!message) return;
    const { conversation } = message;
    if (conversation.lastMessageAt > message.createdAt) return;

    const recipient =
      message.senderId === conversation.studentId ? conversation.staff : conversation.student;
    if (!recipient || recipient.deletedAt) return;
    const read = conversation.reads.find((item) => item.userId === recipient.id);
    if (read && read.lastReadAt >= message.createdAt) return;

    const area = recipient.id === conversation.studentId ? 'app' : 'teach';
    await this.mail.send({
      to: recipient.email,
      locale: recipient.locale,
      template: 'unreadMessage',
      params: {
        firstName: recipient.firstName,
        from: `${message.sender.firstName} ${message.sender.lastName}`,
        link: `${this.config.http.webOrigin}/${recipient.locale}/${area}/messages?thread=${conversation.id}`,
      },
    });
  }
}
