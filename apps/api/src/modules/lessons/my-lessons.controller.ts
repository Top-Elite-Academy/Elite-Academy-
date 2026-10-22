import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type CourseOutline,
  lessonProgressSchema,
  programSlugSchema,
  type StudentLesson,
} from '@eta/shared';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { ApiException } from '../../common/errors/api.exception';
import { StudentLessonsService } from './student-lessons.service';

class LessonProgressDto extends createZodDto(lessonProgressSchema) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** The lesson player for students (spec §4.8). */
@ApiTags('lessons')
@Roles('student')
@Controller('me')
export class MyLessonsController {
  constructor(private readonly lessons: StudentLessonsService) {}

  @Get('courses/:slug')
  outline(@CurrentUser() user: AuthUser, @Param('slug') slug: string): Promise<CourseOutline> {
    if (!programSlugSchema.safeParse(slug).success) throw ApiException.notFound();
    return this.lessons.outline(user, slug);
  }

  @Get('lessons/:id')
  lesson(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<StudentLesson> {
    return this.lessons.lesson(user, id);
  }

  /** Sends the browser to a short-lived signed link for a clean file. */
  @Get('lessons/:id/files/:fileId/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('fileId', uuid) fileId: string,
    @Res() response: Response,
  ): Promise<void> {
    response.redirect(HttpStatus.FOUND, await this.lessons.downloadUrl(user, id, fileId));
  }

  /** Video position and "Mark as complete". */
  @Post('lessons/:id/progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  async progress(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: LessonProgressDto,
  ): Promise<void> {
    await this.lessons.saveProgress(user, id, body);
  }
}
