import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { ForgotPasswordDto, ResetPasswordDto } from './auth.dto';
import { PasswordResetService } from './services/password-reset.service';

@ApiTags('auth')
@Controller('auth/password')
export class PasswordController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  /** Always 202, whether or not the email exists. */
  @Public()
  @Post('forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgot(@Body() body: ForgotPasswordDto, @Client() client: ClientInfo): Promise<void> {
    await this.passwordReset.request(body, client);
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(@Body() body: ResetPasswordDto, @Client() client: ClientInfo): Promise<void> {
    await this.passwordReset.reset(body, client);
  }
}
