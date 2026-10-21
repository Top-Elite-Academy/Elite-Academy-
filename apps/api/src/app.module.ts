import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { Redis } from 'ioredis';
import { ZodValidationPipe } from 'nestjs-zod';
import { RolesGuard } from './common/authz/roles.guard';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { CsrfGuard } from './common/security/csrf.guard';
import { IpRateLimitGuard, UserRateLimitGuard } from './common/security/rate-limit.guards';
import { AppConfig } from './config/app-config';
import { AppConfigModule } from './config/app-config.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionGuard } from './modules/auth/session.guard';
import { ConsentModule } from './modules/consent/consent.module';
import { HealthController } from './modules/health/health.controller';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MailModule } from './modules/mail/mail.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        // BullMQ needs its own connection with unlimited retries for blocking commands.
        connection: new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
      }),
    }),
    AuditModule,
    MailModule,
    AuthModule,
    UsersModule,
    InvitationsModule,
    ConsentModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guards run in this order on every request.
    { provide: APP_GUARD, useClass: IpRateLimitGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useExisting: SessionGuard },
    { provide: APP_GUARD, useClass: UserRateLimitGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
