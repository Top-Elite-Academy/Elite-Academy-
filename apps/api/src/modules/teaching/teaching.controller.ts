import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
  AnnouncementView,
  CohortAttendance,
  CohortStudent,
  StudentNoteView,
  StudentProgress,
  TeachCohort,
  TeachToday,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { AnnouncementsService } from './announcements.service';
import { ProgressService } from './progress.service';
import {
  AnnouncementDto,
  AttendanceQueryDto,
  SaveAttendanceDto,
  StudentNoteDto,
} from './teaching.dto';
import { TeachingService } from './teaching.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Instructor area (designs "Instructor 1–2"). Admin may look at every cohort. */
@ApiTags('teaching')
@Roles('instructor', 'mentor', 'admin')
@Controller('teach')
export class TeachingController {
  constructor(
    private readonly teaching: TeachingService,
    private readonly announcements: AnnouncementsService,
    private readonly progress: ProgressService,
  ) {}

  @Get('today')
  today(@CurrentUser() user: AuthUser): Promise<TeachToday> {
    return this.teaching.today(user);
  }

  @Get('cohorts')
  cohorts(@CurrentUser() user: AuthUser): Promise<TeachCohort[]> {
    return this.teaching.cohorts(user);
  }

  @Get('cohorts/:id')
  cohort(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<TeachCohort> {
    return this.teaching.cohort(user, id);
  }

  @Get('cohorts/:id/students')
  students(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<CohortStudent[]> {
    return this.teaching.students(user, id);
  }

  @Get('cohorts/:id/announcements')
  listAnnouncements(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AnnouncementView[]> {
    return this.announcements.list(user, id);
  }

  /** "Post announcement": every confirmed student gets a notification right away. */
  @Post('cohorts/:id/announcements')
  postAnnouncement(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: AnnouncementDto,
    @Client() client: ClientInfo,
  ): Promise<AnnouncementView> {
    return this.announcements.post(user, id, body, client);
  }

  /** Attendance tab: one class day (default: the latest), every confirmed student. */
  @Get('cohorts/:id/attendance')
  attendance(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Query() query: AttendanceQueryDto,
  ): Promise<CohortAttendance> {
    return this.progress.attendance(user, id, query.date);
  }

  @Put('cohorts/:id/attendance')
  @HttpCode(HttpStatus.NO_CONTENT)
  async saveAttendance(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SaveAttendanceDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.progress.saveAttendance(user, id, body, client);
  }

  /** Student page (design "Instructor 3"): no contact or payment details. */
  @Get('cohorts/:id/students/:userId')
  student(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('userId', uuid) userId: string,
  ): Promise<StudentProgress> {
    return this.progress.student(user, id, userId);
  }

  /** Staff-only note about a student; returns the student's notes. */
  @Post('cohorts/:id/students/:userId/notes')
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('userId', uuid) userId: string,
    @Body() body: StudentNoteDto,
    @Client() client: ClientInfo,
  ): Promise<StudentNoteView[]> {
    return this.progress.addNote(user, id, userId, body, client);
  }
}
