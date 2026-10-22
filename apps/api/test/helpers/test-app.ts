import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { CryptoService } from '../../src/common/crypto/crypto.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { CaptchaService } from '../../src/modules/auth/services/captcha.service';
import { PasswordService } from '../../src/modules/auth/services/password.service';
import type { MailMessage } from '../../src/modules/mail/mail-templates';
import { MailService } from '../../src/modules/mail/mail.service';

/** Captures emails instead of queueing them. */
export class FakeMailService {
  readonly sent: MailMessage[] = [];
  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
  /** The single-use token from the last email of a template (it sits after "#token="). */
  lastToken(template: MailMessage['template']): string {
    const message = [...this.sent].reverse().find((m) => m.template === template);
    const link = message ? (message.params as { link: string }).link : '';
    return link.split('#token=')[1] ?? '';
  }
}

export const VALID_CAPTCHA = 'valid-captcha-token';

/** Turnstile is replaced so tests never call Cloudflare. */
class FakeCaptchaService {
  verify(token: string | undefined): Promise<boolean> {
    return Promise.resolve(token === VALID_CAPTCHA);
  }
}

export interface TestApp {
  app: NestExpressApplication;
  mail: FakeMailService;
  prisma: PrismaService;
  redis: RedisService;
  crypto: CryptoService;
  passwords: PasswordService;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const mail = new FakeMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideProvider(CaptchaService)
    .useClass(FakeCaptchaService)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
    rawBody: true,
  });
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);

  return {
    app,
    mail,
    prisma,
    redis,
    crypto: app.get(CryptoService),
    passwords: app.get(PasswordService),
    async reset() {
      mail.sent.length = 0;
      await redis.flushdb();
      // Triggers are skipped only here, so the append-only audit table can be emptied between tests.
      await prisma.$transaction([
        prisma.$executeRaw`SET LOCAL session_replication_role = replica`,
        prisma.$executeRaw`TRUNCATE audit_logs, student_notes, attendance, mentor_time_off, notifications, announcements, enrollments, payment_events, bookings, package_credits, orders, availability_slots, packages, program_modules, tasks, activities, leads, success_stories, faqs, cohorts, programs, mentor_profiles, consents, auth_tokens, sessions, user_roles, users CASCADE`,
      ]);
    },
    close: () => app.close(),
  };
}
