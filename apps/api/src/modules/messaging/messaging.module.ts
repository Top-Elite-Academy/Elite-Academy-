import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { FILE_SCAN_QUEUE } from '../lessons/lesson-files.service';
import { MessageAttachmentsService } from './message-attachments.service';
import { MessagingController } from './messaging.controller';
import { MESSAGE_EMAIL_QUEUE, MessagingService } from './messaging.service';
import { RecipientsService } from './recipients.service';
import { UnreadEmailProcessor } from './unread-email.processor';

/** Messages & support (spec §4.9). */
@Module({
  imports: [
    BullModule.registerQueue({ name: FILE_SCAN_QUEUE }),
    BullModule.registerQueue({ name: MESSAGE_EMAIL_QUEUE }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, RecipientsService, MessageAttachmentsService, UnreadEmailProcessor],
})
export class MessagingModule {}
