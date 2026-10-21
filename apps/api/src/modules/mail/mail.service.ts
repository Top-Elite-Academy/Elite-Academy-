import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { MailMessage, MailTemplate } from './mail-templates';

export const MAIL_QUEUE = 'mail';

/**
 * Queues an email; a background worker sends it (spec §11: emails run as jobs).
 * Callers never wait on the mail server, and response times do not reveal
 * whether an email was actually sent (e.g. forgot-password).
 */
@Injectable()
export class MailService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue<MailMessage>) {}

  async send<T extends MailTemplate>(message: MailMessage<T>): Promise<void> {
    await this.queue.add(message.template, message, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: true,
      // Failed jobs are kept for a week for debugging; they contain single-use links that expire.
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    });
  }
}
