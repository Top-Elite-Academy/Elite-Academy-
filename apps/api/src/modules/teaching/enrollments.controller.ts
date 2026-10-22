import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CohortRef, PendingEnrollment, StudentEnrollment } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { EnrollmentsService } from './enrollments.service';
import { RequestEnrollmentDto } from './teaching.dto';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Student side: choose a cohort and see own enrollments. */
@ApiTags('enrollments')
@Roles('student')
@Controller('me')
export class MyEnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get('enrollments')
  mine(@CurrentUser() user: AuthUser): Promise<StudentEnrollment[]> {
    return this.enrollments.mine(user);
  }

  @Get('available-cohorts')
  available(@CurrentUser() user: AuthUser): Promise<CohortRef[]> {
    return this.enrollments.available(user);
  }

  /** Joins as "pending"; nothing unlocks until staff confirm. */
  @Post('enrollments')
  request(
    @CurrentUser() user: AuthUser,
    @Body() body: RequestEnrollmentDto,
    @Client() client: ClientInfo,
  ): Promise<StudentEnrollment> {
    return this.enrollments.request(user, body.cohortId, client);
  }
}

/** Staff side: confirm a student once payment is arranged. */
@ApiTags('enrollments')
@Roles('admin', 'sales')
@Controller('enrollments')
export class StaffEnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Get('pending')
  pending(@CurrentUser() user: AuthUser): Promise<PendingEnrollment[]> {
    return this.enrollments.pending(user);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Client() client: ClientInfo,
  ): Promise<void> {
    await this.enrollments.confirm(user, id, client);
  }
}
