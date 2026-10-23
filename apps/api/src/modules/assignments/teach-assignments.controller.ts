import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AssignmentView,
  gradeSchema,
  saveAssignmentSchema,
  submissionFilterSchema,
  type TeachSubmission,
  type TeachSubmissionList,
} from '@eta/shared';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { GradingService } from './grading.service';
import { TeachAssignmentsService } from './teach-assignments.service';

class SaveAssignmentDto extends createZodDto(saveAssignmentSchema) {}
class GradeDto extends createZodDto(gradeSchema) {}
class SubmissionsQueryDto extends createZodDto(
  z.object({ status: submissionFilterSchema.default('to_grade') }),
) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** Exercises and grading for instructors (design "Instructor 4"). */
@ApiTags('assignments')
@Roles('instructor', 'admin')
@Controller('teach')
export class TeachAssignmentsController {
  constructor(
    private readonly assignments: TeachAssignmentsService,
    private readonly grading: GradingService,
  ) {}

  /** The lesson's exercise ({ assignment: null } when it has none). */
  @Get('lessons/:id/assignment')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<{ assignment: AssignmentView | null }> {
    return { assignment: await this.assignments.get(user, id) };
  }

  @Put('lessons/:id/assignment')
  save(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SaveAssignmentDto,
    @Client() client: ClientInfo,
  ): Promise<AssignmentView> {
    return this.assignments.save(user, id, body, client);
  }

  @Delete('lessons/:id/assignment')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.assignments.remove(user, id, client);
  }

  @Get('cohorts/:id/submissions')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Query() query: SubmissionsQueryDto,
  ): Promise<TeachSubmissionList> {
    return this.grading.list(user, id, query.status);
  }

  @Get('submissions/:id')
  submission(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<TeachSubmission> {
    return this.grading.get(user, id);
  }

  /** Draft grade: the student does not see it yet. */
  @Put('submissions/:id/grade')
  grade(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: GradeDto,
    @Client() client: ClientInfo,
  ): Promise<TeachSubmission> {
    return this.grading.grade(user, id, body, client);
  }

  @Post('submissions/:id/return')
  @HttpCode(HttpStatus.OK)
  returnToStudent(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<TeachSubmission> {
    return this.grading.returnToStudent(user, id, client);
  }

  @Get('submissions/:id/files/:fileId/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('fileId', uuid) fileId: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.grading.downloadUrl(user, id, fileId));
  }
}
