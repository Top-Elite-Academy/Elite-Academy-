import { tmpdir } from 'node:os';
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
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import {
  MAX_FILE_BYTES,
  MAX_SUBMISSION_FILES,
  type StudentAssignment,
  submitWorkSchema,
} from '@eta/shared';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import type { ReceivedFile } from '../lessons/lesson-files.service';
import { StudentSubmissionsService } from './student-submissions.service';

class SubmitWorkDto extends createZodDto(submitWorkSchema) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** A student's exercises: hand in, see the returned grade. */
@ApiTags('assignments')
@Roles('student')
@Controller('me')
export class MySubmissionsController {
  constructor(private readonly submissions: StudentSubmissionsService) {}

  @Get('lessons/:id/assignment')
  get(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<StudentAssignment> {
    return this.submissions.get(user, id);
  }

  /** Multipart: "repoUrl", "note" and up to five "files". */
  @Post('lessons/:id/submission')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', MAX_SUBMISSION_FILES, {
      dest: tmpdir(),
      limits: { fileSize: MAX_FILE_BYTES, files: MAX_SUBMISSION_FILES },
    }),
  )
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SubmitWorkDto,
    @UploadedFiles() files: ReceivedFile[] | undefined,
    @Client() client: ClientInfo,
  ): Promise<StudentAssignment> {
    return this.submissions.submit(user, id, body, files ?? [], client);
  }

  @Delete('submissions/:id/files/:fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFile(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('fileId', uuid) fileId: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.submissions.removeFile(user, id, fileId, client);
  }

  @Get('submissions/:id/files/:fileId/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('fileId', uuid) fileId: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.submissions.downloadUrl(user, id, fileId));
  }
}
