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
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import {
  createLessonSchema,
  type CreateVideoResponse,
  createVideoSchema,
  fileKindSchema,
  type LessonFileView,
  type LessonVideoView,
  MAX_FILE_BYTES,
  type TeachLesson,
  type TeachLessonList,
  type TeachProgram,
  updateLessonSchema,
} from '@eta/shared';
import type { Request } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { ApiException } from '../../common/errors/api.exception';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { LessonFilesService, type ReceivedFile } from './lesson-files.service';
import { LessonVideosService } from './lesson-videos.service';
import { TeachLessonsService } from './teach-lessons.service';

class CreateLessonDto extends createZodDto(createLessonSchema) {}
class UpdateLessonDto extends createZodDto(updateLessonSchema) {}
class CreateVideoDto extends createZodDto(createVideoSchema) {}
class FileKindDto extends createZodDto(z.object({ kind: fileKindSchema })) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** Course content (design "Instructor 6"): lessons, videos, materials and exercises. */
@ApiTags('lessons')
@Roles('instructor', 'admin')
@Controller('teach')
export class TeachLessonsController {
  constructor(
    private readonly lessons: TeachLessonsService,
    private readonly videos: LessonVideosService,
    private readonly files: LessonFilesService,
  ) {}

  @Get('programs')
  programs(@CurrentUser() user: AuthUser): Promise<TeachProgram[]> {
    return this.lessons.programs(user);
  }

  @Get('programs/:id/lessons')
  list(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<TeachLessonList> {
    return this.lessons.list(user, id);
  }

  @Post('programs/:id/lessons')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: CreateLessonDto,
    @Client() client: ClientInfo,
  ): Promise<TeachLesson> {
    return this.lessons.create(user, id, body, client);
  }

  @Get('lessons/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<TeachLesson> {
    return this.lessons.get(user, id);
  }

  @Patch('lessons/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: UpdateLessonDto,
    @Client() client: ClientInfo,
  ): Promise<TeachLesson> {
    return this.lessons.update(user, id, body, client);
  }

  @Post('lessons/:id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<TeachLesson> {
    return this.lessons.publish(user, id, client);
  }

  @Post('lessons/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<TeachLesson> {
    return this.lessons.unpublish(user, id, client);
  }

  /** Drafts only: removes the lesson with its videos and files. */
  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    const lesson = await this.lessons.assertDeletable(user, id);
    for (const video of lesson.videos) await this.videos.removeRecord(video);
    for (const file of lesson.files) await this.files.remove(user, file.id, client);
    await this.lessons.delete(user, lesson, client);
  }

  /** Reserves a video upload; the answer says where the browser sends the file. */
  @Post('lessons/:id/videos')
  createVideo(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: CreateVideoDto,
    @Client() client: ClientInfo,
  ): Promise<CreateVideoResponse> {
    return this.videos.create(user, id, body, client);
  }

  /** Local stand-in only: the whole video file as the request body. */
  @Put('videos/:id/content')
  receiveVideo(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Req() request: Request,
  ): Promise<LessonVideoView> {
    const size = Number(request.headers['content-length']);
    if (!Number.isInteger(size) || size <= 0) throw ApiException.badRequest('video.sizeMismatch');
    return this.videos.receiveLocal(user, id, request, size);
  }

  @Post('videos/:id/refresh')
  @HttpCode(HttpStatus.OK)
  refreshVideo(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<LessonVideoView> {
    return this.videos.refresh(user, id);
  }

  @Delete('videos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVideo(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.videos.remove(user, id, client);
  }

  /** A material or exercise (multipart: "file" and "kind"); virus-scanned before students see it. */
  @Post('lessons/:id/files')
  @UseInterceptors(
    FileInterceptor('file', { dest: tmpdir(), limits: { fileSize: MAX_FILE_BYTES, files: 1 } }),
  )
  uploadFile(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: FileKindDto,
    @UploadedFile() file: ReceivedFile | undefined,
    @Client() client: ClientInfo,
  ): Promise<LessonFileView> {
    if (!file) throw ApiException.badRequest('file.required');
    return this.files.upload(user, id, body.kind, file, client);
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFile(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.files.remove(user, id, client);
  }
}
