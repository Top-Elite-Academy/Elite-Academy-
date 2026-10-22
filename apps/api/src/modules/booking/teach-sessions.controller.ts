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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type MentorAvailability,
  type MentorSessions,
  sessionOutcomeSchema,
  timeOffSchema,
  updateAvailabilitySchema,
} from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { MentorScheduleService } from './mentor-schedule.service';

class UpdateAvailabilityDto extends createZodDto(updateAvailabilitySchema) {}
class TimeOffDto extends createZodDto(timeOffSchema) {}
class SessionOutcomeDto extends createZodDto(sessionOutcomeSchema) {}

const uuid = new ParseUUIDPipe({ version: '4' });

/** Sessions & availability for instructors and mentors (design "Instructor 5"). */
@ApiTags('teaching')
@Roles('instructor', 'mentor')
@Controller('teach')
export class TeachSessionsController {
  constructor(private readonly schedule: MentorScheduleService) {}

  @Get('availability')
  availability(@CurrentUser() user: AuthUser): Promise<MentorAvailability> {
    return this.schedule.availability(user);
  }

  @Put('availability')
  updateAvailability(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateAvailabilityDto,
    @Client() client: ClientInfo,
  ): Promise<MentorAvailability> {
    return this.schedule.updateAvailability(user, body, client);
  }

  @Post('time-off')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addTimeOff(
    @CurrentUser() user: AuthUser,
    @Body() body: TimeOffDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.schedule.addTimeOff(user, body, client);
  }

  @Delete('time-off/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTimeOff(@CurrentUser() user: AuthUser, @Param('id', uuid) id: string): Promise<void> {
    await this.schedule.removeTimeOff(user, id);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser): Promise<MentorSessions> {
    return this.schedule.sessions(user);
  }

  /** "Session held" / "Student didn't come", with notes the student sees. */
  @Post('sessions/:id/outcome')
  @HttpCode(HttpStatus.NO_CONTENT)
  async outcome(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() body: SessionOutcomeDto,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.schedule.recordOutcome(user, id, body, client);
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.schedule.cancel(user, id, client);
  }
}
