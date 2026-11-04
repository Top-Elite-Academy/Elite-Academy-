import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  askQuestionSchema,
  discussionReplySchema,
  type DiscussionSummary,
  type DiscussionThreadView,
  moderateThreadSchema,
  reportPostSchema,
  type StudentDiscussion,
} from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { DiscussionModerationService } from './discussion-moderation.service';
import { DiscussionsService } from './discussions.service';

class AskQuestionDto extends createZodDto(askQuestionSchema) {}
class DiscussionReplyDto extends createZodDto(discussionReplySchema) {}
class ModerateThreadDto extends createZodDto(moderateThreadSchema) {}
class ReportPostDto extends createZodDto(reportPostSchema) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** A student's view: the questions under a lesson's exercise, and asking one. */
@ApiTags('discussions')
@Roles('student')
@Controller('me/lessons/:id/discussion')
export class MyDiscussionController {
  constructor(private readonly discussions: DiscussionsService) {}

  /** { discussion: null } when the lesson has no exercise. */
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) lessonId: string,
  ): Promise<{ discussion: StudentDiscussion | null }> {
    return { discussion: await this.discussions.forLesson(user, lessonId) };
  }

  @Post()
  ask(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) lessonId: string,
    @Body() body: AskQuestionDto,
    @Client() client: ClientInfo,
  ): Promise<{ id: string }> {
    return this.discussions.ask(user, lessonId, body, client);
  }
}

/** The instructor's view of one cohort's questions (removed and reported ones included). */
@ApiTags('discussions')
@Roles('instructor', 'admin')
@Controller('teach/cohorts/:id/discussions')
export class TeachDiscussionsController {
  constructor(private readonly discussions: DiscussionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) cohortId: string,
  ): Promise<DiscussionSummary[]> {
    return this.discussions.forCohort(user, cohortId);
  }
}

/** One thread, for its cohort's students and its moderators (spec §4.11). */
@ApiTags('discussions')
@Roles('student', 'instructor', 'admin')
@Controller('discussions')
export class DiscussionsController {
  constructor(
    private readonly discussions: DiscussionsService,
    private readonly moderation: DiscussionModerationService,
  ) {}

  @Get(':id')
  thread(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<DiscussionThreadView> {
    return this.discussions.thread(user, id);
  }

  @Post(':id/replies')
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: DiscussionReplyDto,
  ): Promise<DiscussionThreadView> {
    return this.discussions.reply(user, id, body.body);
  }

  /** Instructor: pin, or mark the answer. */
  @Patch(':id')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: ModerateThreadDto,
  ): Promise<DiscussionThreadView> {
    return this.moderation.moderate(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.moderation.removeThread(user, id, client);
  }

  @Delete('replies/:replyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeReply(
    @CurrentUser() user: AuthUser,
    @Param('replyId', uuid) replyId: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.moderation.removeReply(user, replyId, client);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async report(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: ReportPostDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.moderation.report(user, id, null, body.reason, client);
  }

  @Post(':id/replies/:replyId/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reportReply(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('replyId', uuid) replyId: string,
    @Body() body: ReportPostDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.moderation.report(user, id, replyId, body.reason, client);
  }

  /** Instructor keeps the reported posts. */
  @Post(':id/reports/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismissReports(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.moderation.dismissReports(user, id, client);
  }
}
