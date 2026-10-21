import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { acceptInvitationSchema, createInvitationSchema } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthUser } from '../../common/authz/auth-context';
import { CurrentUser, Public, Roles } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { InvitationsService } from './invitations.service';

class CreateInvitationDto extends createZodDto(createInvitationSchema) {}
class AcceptInvitationDto extends createZodDto(acceptInvitationSchema) {}

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  /** Admin invites a person and chooses their roles (spec §5.1 Users & roles). */
  @Roles('admin')
  @Post()
  create(
    @Body() body: CreateInvitationDto,
    @CurrentUser() actor: AuthUser,
    @Client() client: ClientInfo,
  ): Promise<{ id: string }> {
    return this.invitations.create(body, actor, client);
  }

  /** The invited person sets their password from the emailed link. */
  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(@Body() body: AcceptInvitationDto, @Client() client: ClientInfo): Promise<void> {
    await this.invitations.accept(body, client);
  }
}
