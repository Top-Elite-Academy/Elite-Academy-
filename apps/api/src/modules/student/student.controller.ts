import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  sessionsQuerySchema,
  type StudentOrder,
  type StudentOverview,
  type StudentSession,
} from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Roles } from '../../common/authz/decorators';
import { StudentService } from './student.service';

class SessionsQueryDto extends createZodDto(sessionsQuerySchema) {}

/** Student area data (spec §4). Students only; always the caller's own records. */
@ApiTags('student')
@Roles('student')
@Controller('me')
export class StudentController {
  constructor(private readonly student: StudentService) {}

  /** Overview cards: next sessions and mentoring plans (spec §4.3). */
  @Get('overview')
  overview(@CurrentUser() user: AuthUser): Promise<StudentOverview> {
    return this.student.overview(user);
  }

  @Get('sessions')
  sessions(
    @CurrentUser() user: AuthUser,
    @Query() query: SessionsQueryDto,
  ): Promise<StudentSession[]> {
    return this.student.sessions(user, query.scope);
  }

  @Get('orders')
  orders(@CurrentUser() user: AuthUser): Promise<StudentOrder[]> {
    return this.student.orders(user);
  }
}
