import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RealtimeService } from './realtime.service';

/** Notification bell with live updates; other modules call NotificationsService.notify. */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RealtimeService],
  exports: [NotificationsService, RealtimeService],
})
export class NotificationsModule {}
