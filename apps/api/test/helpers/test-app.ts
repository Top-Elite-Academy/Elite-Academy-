import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { CryptoService } from '../../src/common/crypto/crypto.service';
import { FileStorage } from '../../src/common/files/file-storage';
import { VirusScanner } from '../../src/common/files/virus-scanner';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { CaptchaService } from '../../src/modules/auth/services/captcha.service';
import { PasswordService } from '../../src/modules/auth/services/password.service';
import type { MailMessage } from '../../src/modules/mail/mail-templates';
import { MailService } from '../../src/modules/mail/mail.service';
import { FakeVirusScanner, MemoryFileStorage } from './fake-files';

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
  /** In-memory file storage (lesson files and local videos). */
  storage: MemoryFileStorage;
  prisma: PrismaService;
  redis: RedisService;
  crypto: CryptoService;
  passwords: PasswordService;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const mail = new FakeMailService();
  const storage = new MemoryFileStorage();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideProvider(CaptchaService)
    .useClass(FakeCaptchaService)
    .overrideProvider(FileStorage)
    .useValue(storage)
    .overrideProvider(VirusScanner)
    .useClass(FakeVirusScanner)
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
    storage,
    prisma,
    redis,
    crypto: app.get(CryptoService),
    passwords: app.get(PasswordService),
    async reset() {
      mail.sent.length = 0;
      storage.objects.clear();
      await redis.flushdb();
      // Triggers are skipped only here, so the append-only audit table can be emptied between tests.
      await prisma.$transaction([
        prisma.$executeRaw`SET LOCAL session_replication_role = replica`,
        prisma.$executeRaw`TRUNCATE audit_logs, message_attachments, messages, conversation_reads, conversations, submission_files, submissions, assignments, lesson_progress, lesson_files, lesson_videos, lessons, student_notes, attendance, mentor_time_off, notifications, announcements, enrollments, payment_events, bookings, package_credits, orders, availability_slots, packages, program_modules, tasks, activities, leads, success_stories, faqs, cohorts, programs, mentor_profiles, consents, auth_tokens, sessions, user_roles, users CASCADE`,
      ]);
    },
    close: () => app.close(),
  };
}
