import { open, unlink } from 'node:fs/promises';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  ALLOWED_FILE_TYPES,
  extensionOf,
  type LessonFileKind,
  type LessonFileView,
  MAX_FILE_BYTES,
} from '@eta/shared';
import type { Queue } from 'bullmq';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { FileStorage } from '../../common/files/file-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toFileView } from './lessons.mapper';
import { TeachLessonsService } from './teach-lessons.service';

export const FILE_SCAN_QUEUE = 'file-scan';
export type ScanTarget = 'lesson' | 'submission';
export interface FileScanJob {
  fileId: string;
  /** Which table the file is in (jobs queued before submissions existed have none: lesson). */
  target?: ScanTarget;
}

/** Retries for a scan job; after the last one the file is marked failed. */
export const SCAN_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: true,
} as const;

/** Where a file waits until the virus scan, and where it lives afterwards. */
export const quarantineKey = (fileId: string) => `quarantine/${fileId}`;
export const approvedKey = (lessonId: string, fileId: string) => `lessons/${lessonId}/${fileId}`;

/** Only the base name, without path parts or control characters. */
export function safeFileName(original: string): string {
  // Both separators: a Windows browser may send "C:\fakepath\notes.pdf".
  const base = original.split(/[\\/]/).pop() ?? '';
  return base.replace(/\p{Cc}/gu, '').slice(0, 200) || 'file';
}

/** The upload as received by the API (a temporary file on disk). */
export interface ReceivedFile {
  path: string;
  originalname: string;
  size: number;
}

/**
 * Materials and exercises for a lesson. An upload goes to quarantine first;
 * students can download it only after the virus scan says clean (spec §9).
 */
@Injectable()
export class LessonFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessons: TeachLessonsService,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
    @InjectQueue(FILE_SCAN_QUEUE) private readonly queue: Queue<FileScanJob>,
  ) {}

  async upload(
    user: AuthUser,
    lessonId: string,
    kind: LessonFileKind,
    file: ReceivedFile,
    client: ClientInfo,
  ): Promise<LessonFileView> {
    try {
      const lesson = await this.lessons.lessonRecord(user, lessonId);
      const fileName = safeFileName(file.originalname);
      const contentType = ALLOWED_FILE_TYPES[extensionOf(fileName)];
      if (!contentType) throw ApiException.badRequest('file.type');
      if (file.size <= 0 || file.size > MAX_FILE_BYTES)
        throw ApiException.badRequest('file.tooLarge');

      const row = await this.prisma.lessonFile.create({
        data: {
          lessonId: lesson.id,
          kind,
          fileName,
          contentType,
          sizeBytes: file.size,
          storageKey: 'pending',
        },
      });
      // A file the server cannot read (e.g. locked by the machine's own antivirus) is refused.
      try {
        const handle = await open(file.path);
        await this.storage.put(quarantineKey(row.id), handle.createReadStream(), {
          size: file.size,
          contentType,
        });
      } catch {
        await this.prisma.lessonFile.delete({ where: { id: row.id } });
        await this.storage.delete(quarantineKey(row.id)).catch(() => undefined);
        throw ApiException.badRequest('file.rejected');
      }
      const saved = await this.prisma.lessonFile.update({
        where: { id: row.id },
        data: { storageKey: quarantineKey(row.id) },
      });
      await this.queue.add('scan', { fileId: row.id, target: 'lesson' }, SCAN_JOB_OPTIONS);
      await this.audit.record({
        actorId: user.id,
        action: 'lessonFile.uploaded',
        entity: 'lessonFile',
        entityId: row.id,
        after: { lessonId, fileName, kind, size: file.size },
        client,
      });
      return toFileView(saved);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async remove(user: AuthUser, fileId: string, client: ClientInfo): Promise<void> {
    const file = await this.prisma.lessonFile.findUnique({ where: { id: fileId } });
    if (!file) throw ApiException.notFound();
    await this.lessons.lessonRecord(user, file.lessonId);
    await this.prisma.lessonFile.delete({ where: { id: file.id } });
    if (file.storageKey !== 'pending')
      await this.storage.delete(file.storageKey).catch(() => undefined);
    await this.audit.record({
      actorId: user.id,
      action: 'lessonFile.deleted',
      entity: 'lessonFile',
      entityId: file.id,
      after: { lessonId: file.lessonId, fileName: file.fileName },
      client,
    });
  }
}
