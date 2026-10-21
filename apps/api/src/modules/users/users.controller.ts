import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type MeResponse, updateMyPreferencesSchema } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { toMeResponse } from './user.mapper';
import { UsersService } from './users.service';

class UpdateMyPreferencesDto extends createZodDto(updateMyPreferencesSchema) {}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): MeResponse {
    return toMeResponse(user);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateMyPreferencesDto,
    @Client() client: ClientInfo,
  ): Promise<MeResponse> {
    return this.users.updatePreferences(user, body, client);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MeResponse> {
    return this.users.findVisibleTo(user, id);
  }
}
