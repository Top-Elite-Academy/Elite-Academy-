import { tmpdir } from 'node:os';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import {
  conversationFilterSchema,
  type ConversationList,
  type ConversationThread,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  type Recipient,
  sendMessageSchema,
  startConversationSchema,
} from '@eta/shared';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import type { ReceivedFile } from '../lessons/lesson-files.service';
import { MessagingService } from './messaging.service';
import { RecipientsService } from './recipients.service';

class ConversationFilterDto extends createZodDto(conversationFilterSchema) {}
class StartConversationDto extends createZodDto(startConversationSchema) {}
class SendMessageDto extends createZodDto(sendMessageSchema) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** Messages & support (spec §4.9) for students, instructors, mentors and the teams. */
@ApiTags('messages')
@Roles('student', 'instructor', 'mentor', 'admin', 'sales')
@Controller('messages')
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly recipients: RecipientsService,
  ) {}

  @Get('conversations')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ConversationFilterDto,
  ): Promise<ConversationList> {
    return this.messaging.list(user, query);
  }

  @Get('unread')
  async unread(@CurrentUser() user: AuthUser): Promise<{ unread: number }> {
    return { unread: await this.messaging.unreadCount(user) };
  }

  @Get('recipients')
  recipientList(@CurrentUser() user: AuthUser): Promise<Recipient[]> {
    return this.recipients.list(user);
  }

  @Post('conversations')
  start(
    @CurrentUser() user: AuthUser,
    @Body() body: StartConversationDto,
  ): Promise<{ id: string }> {
    return this.messaging.start(user, body);
  }

  /** Opening a thread marks it read. */
  @Get('conversations/:id')
  thread(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<ConversationThread> {
    return this.messaging.thread(user, id);
  }

  /** Multipart: "body" and up to three "files". */
  @Post('conversations/:id/messages')
  @UseInterceptors(
    FilesInterceptor('files', MAX_ATTACHMENTS, {
      dest: tmpdir(),
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_ATTACHMENTS },
    }),
  )
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SendMessageDto,
    @UploadedFiles() files: ReceivedFile[] | undefined,
  ): Promise<ConversationThread> {
    return this.messaging.send(user, id, body.body, files ?? []);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    await this.messaging.thread(user, id);
  }

  @Get('attachments/:id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.messaging.attachmentUrl(user, id));
  }
}
