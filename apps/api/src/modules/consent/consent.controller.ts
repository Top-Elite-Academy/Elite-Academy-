import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser } from '../../common/authz/decorators';
import { ConsentService, type ConsentView } from './consent.service';

@ApiTags('consents')
@Controller('users/:userId/consents')
export class ConsentController {
  constructor(private readonly consents: ConsentService) {}

  @Get()
  list(
    @CurrentUser() actor: AuthUser,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ): Promise<ConsentView[]> {
    return this.consents.listForUser(actor, userId);
  }
}
