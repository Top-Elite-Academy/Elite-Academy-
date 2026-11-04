import { tmpdir } from 'node:os';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { SYLLABUS_MAX_BYTES, type SyllabusFileView } from '@eta/shared';
import type { Response } from 'express';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { ApiException } from '../../common/errors/api.exception';
import { Client, type ClientInfo } from '../../common/http/client-info';
import type { ReceivedFile } from '../lessons/lesson-files.service';
import { SyllabusService } from './syllabus.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** The instructor's or admin's view: upload, replace, download and delete. */
@ApiTags('syllabus')
@Roles('instructor', 'admin')
@Controller('teach')
export class TeachSyllabusController {
  constructor(private readonly syllabus: SyllabusService) {}

  @Get('programs/:id/syllabus')
  list(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) programId: string,
  ): Promise<SyllabusFileView[]> {
    return this.syllabus.list(user, programId);
  }

  /** Multipart: one "file" (PDF). Replaces the current syllabus once it passes the scan. */
  @Post('programs/:id/syllabus')
  @UseInterceptors(
    FileInterceptor('file', { dest: tmpdir(), limits: { fileSize: SYLLABUS_MAX_BYTES, files: 1 } }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) programId: string,
    @UploadedFile() file: ReceivedFile | undefined,
    @Client() client: ClientInfo,
  ): Promise<SyllabusFileView> {
    if (!file) throw ApiException.badRequest('file.required');
    return this.syllabus.upload(user, programId, file, client);
  }

  @Get('syllabus/:id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.syllabus.teachDownloadUrl(user, id));
  }

  @Delete('syllabus/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.syllabus.remove(user, id, client);
  }
}

/** A confirmed student downloads their program's syllabus. */
@ApiTags('syllabus')
@Roles('student')
@Controller('me')
export class MySyllabusController {
  constructor(private readonly syllabus: SyllabusService) {}

  @Get('courses/:slug/syllabus/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.syllabus.studentDownloadUrl(user, slug));
  }
}
