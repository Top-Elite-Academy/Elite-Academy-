import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PasswordController } from './password.controller';
import { AuthCookiesService } from './services/auth-cookies.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthService } from './services/auth.service';
import { BreachedPasswordService } from './services/breached-password.service';
import { CaptchaService } from './services/captcha.service';
import { LoginProtectionService } from './services/login-protection.service';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordService } from './services/password.service';
import { SessionService } from './services/session.service';
import { TotpService } from './services/totp.service';
import { TwoFactorService } from './services/two-factor.service';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController, PasswordController],
  providers: [
    AuthService,
    TwoFactorService,
    PasswordResetService,
    SessionService,
    AuthCookiesService,
    AuthTokenService,
    PasswordService,
    BreachedPasswordService,
    CaptchaService,
    LoginProtectionService,
    TotpService,
    SessionGuard,
  ],
  exports: [SessionService, SessionGuard, AuthCookiesService, AuthTokenService, PasswordService],
})
export class AuthModule {}
