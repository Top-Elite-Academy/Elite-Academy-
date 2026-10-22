import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AnnouncementView, CohortStudent, TeachCohort, TeachToday } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementDto } from './teaching.dto';
import { TeachingService } from './teaching.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Instructor area (designs "Instructor 1–2"). Admin may look at every cohort. */
@ApiTags('teaching')
@Roles('instructor', 'admin')
@Controller('teach')
export class TeachingController {
  constructor(
    private readonly teaching: TeachingService,
    private readonly announcements: AnnouncementsService,
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
}
