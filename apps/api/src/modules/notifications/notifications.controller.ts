import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  type MessageEvent,
  Post,
  Sse,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { markNotificationsReadSchema, type NotificationsResponse } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { Observable } from 'rxjs';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser } from '../../common/authz/decorators';
import { NotificationsService } from './notifications.service';
import { RealtimeService } from './realtime.service';

class MarkReadDto extends createZodDto(markNotificationsReadSchema) {}

/** The signed-in user's notification bell (any role). */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<NotificationsResponse> {
    return this.notifications.list(user);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@CurrentUser() user: AuthUser, @Body() body: MarkReadDto): Promise<void> {
    await this.notifications.markRead(user, body.ids);
  }

  /** Live stream (Server-Sent Events). The browser reconnects by itself if it drops. */
  @Sse('stream')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('X-Accel-Buffering', 'no')
  stream(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.realtime.streamFor(user.id);
  }
}
