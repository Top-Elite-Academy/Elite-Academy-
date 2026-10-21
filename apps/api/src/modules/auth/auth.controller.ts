import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { LoginResponse, TotpSetupResponse } from '@eta/shared';
import type { Request, Response } from 'express';
import type { AuthContext } from '../../common/authz/auth-context';
import { AllowPendingMfa, CurrentSession, Public } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { LoginDto, SignupDto, TotpCodeDto } from './auth.dto';
import { AuthCookiesService } from './services/auth-cookies.service';
import { AuthService } from './services/auth.service';
import { SignupService } from './services/signup.service';
import { TwoFactorService } from './services/two-factor.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly signupService: SignupService,
    private readonly twoFactor: TwoFactorService,
    private readonly cookies: AuthCookiesService,
  ) {}

  /** Issues the CSRF token the web app sends back on every state-changing request. */
  @Public()
  @Get('csrf')
  csrf(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return { csrfToken: this.cookies.ensureCsrf(request, response) };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Client() client: ClientInfo,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const step = await this.auth.login(body, client, this.cookies.readSession(request));
    this.cookies.setSession(response, step.token);
    return { next: step.next };
  }

  /** Student account for booking (spec §3.7); signs the new student in. */
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() body: SignupDto,
    @Client() client: ClientInfo,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const previous = this.cookies.readSession(request);
    if (previous) await this.auth.revokeSessionToken(previous);
    this.cookies.setSession(response, await this.signupService.signup(body, client));
    return { next: 'done' };
  }

  @AllowPendingMfa()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  setupTwoFactor(@CurrentSession() auth: AuthContext): Promise<TotpSetupResponse> {
    return this.twoFactor.startSetup(auth);
  }

  @AllowPendingMfa()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @CurrentSession() auth: AuthContext,
    @Body() body: TotpCodeDto,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    this.cookies.setSession(response, await this.twoFactor.enable(auth, body.code, client));
    return { next: 'done' };
  }

  @AllowPendingMfa()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(
    @CurrentSession() auth: AuthContext,
    @Body() body: TotpCodeDto,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    this.cookies.setSession(response, await this.twoFactor.verify(auth, body.code, client));
    return { next: 'done' };
  }

  @AllowPendingMfa()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentSession() auth: AuthContext,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(auth, client);
    this.cookies.clearSession(response);
  }

  /** "Sign out of all devices" (spec §4.7, §9.1). */
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutEverywhere(
    @CurrentSession() auth: AuthContext,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logoutEverywhere(auth, client);
    this.cookies.clearSession(response);
  }
}
