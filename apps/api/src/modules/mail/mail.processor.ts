import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfig } from '../../config/app-config';
import { type MailMessage, renderMail } from './mail-templates';
import { MAIL_QUEUE } from './mail.service';

/** Sends queued emails over SMTP (Mailpit locally; Postmark/Resend/SES in production). */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transport: Transporter;

  constructor(private readonly config: AppConfig) {
    super();
    const { host, port, secure, user, password } = config.mail;
    this.transport = createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
    });
  }

  async process(job: Job<MailMessage>): Promise<void> {
    const { subject, text } = renderMail(job.data);
    await this.transport.sendMail({ from: this.config.mail.from, to: job.data.to, subject, text });
    // Log the template and job id only — never the address or the link.
    this.logger.log(`Sent "${job.data.template}" email (job ${job.id ?? '?'})`);
  }
}
