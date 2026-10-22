import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sessionTimeSchema } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { SessionChangesService } from './session-changes.service';

class SessionTimeDto extends createZodDto(sessionTimeSchema) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** A student changing their own sessions (spec §4.3, §4.5). */
@ApiTags('student')
@Roles('student')
@Controller('me')
export class MySessionsController {
  constructor(private readonly changes: SessionChangesService) {}

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.changes.cancelOwn(user, id, client);
  }

  @Post('sessions/:id/reschedule')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SessionTimeDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.changes.rescheduleOwn(user, id, new Date(body.startAt), client);
  }

  /** "Book the next meeting" from a plan: no payment. */
  @Post('packages/:id/book')
  book(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SessionTimeDto,
    @Client() client: ClientInfo,
  ): Promise<{ bookingId: string }> {
    return this.changes.bookWithCredit(user, id, new Date(body.startAt), client);
  }
}
