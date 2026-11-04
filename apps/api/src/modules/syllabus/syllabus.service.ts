import { open, unlink } from 'node:fs/promises';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { extensionOf, SYLLABUS_MAX_BYTES, type SyllabusFileView } from '@eta/shared';
import type { Queue } from 'bullmq';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorage } from '../../common/files/file-storage';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  FILE_SCAN_QUEUE,
  type FileScanJob,
  quarantineKey,
  type ReceivedFile,
  SCAN_JOB_OPTIONS,
  safeFileName,
} from '../lessons/lesson-files.service';
import { StudentLessonsService } from '../lessons/student-lessons.service';
import { TeachLessonsService } from '../lessons/teach-lessons.service';

/** Download links work for a few minutes only. */
const DOWNLOAD_SECONDS = 5 * 60;
const PDF_MAGIC = '%PDF-';

type SyllabusRow = {
  id: string;
  fileName: string;
  sizeBytes: number;
  scanStatus: string;
  createdAt: Date;
};

const toView = (row: SyllabusRow): SyllabusFileView => ({
  id: row.id,
  fileName: row.fileName,
  sizeBytes: row.sizeBytes,
  scanStatus: row.scanStatus as SyllabusFileView['scanStatus'],
  uploadedAt: row.createdAt.toISOString(),
});

/**
 * A program's syllabus PDF (spec §3.4, §6.2). The instructor or an admin
 * uploads it; it waits in quarantine until the virus scan says clean. Only the
 * program's confirmed students, its instructor and admins can download it.
 */
@Injectable()
export class SyllabusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teachLessons: TeachLessonsService,
    private readonly studentLessons: StudentLessonsService,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
    @InjectQueue(FILE_SCAN_QUEUE) private readonly queue: Queue<FileScanJob>,
  ) {}

  /** Uploaded versions, newest first (older ones go once a newer one is clean). */
  async list(user: AuthUser, programId: string): Promise<SyllabusFileView[]> {
    await this.teachLessons.programRecord(user, programId);
    const rows = await this.prisma.syllabusFile.findMany({
      where: { programId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toView);
  }

  async upload(
    user: AuthUser,
    programId: string,
    file: ReceivedFile,
    client: ClientInfo,
  ): Promise<SyllabusFileView> {
    try {
      await this.teachLessons.programRecord(user, programId);
      const fileName = safeFileName(file.originalname);
      if (extensionOf(fileName) !== 'pdf') throw ApiException.badRequest('syllabus.pdfOnly');
      if (file.size <= 0 || file.size > SYLLABUS_MAX_BYTES)
        throw ApiException.badRequest('syllabus.tooLarge');
      // The name says PDF; the first bytes must too.
      const handle = await open(file.path);
      try {
        const head = Buffer.alloc(PDF_MAGIC.length);
        await handle.read(head, 0, head.length, 0);
        if (head.toString('latin1') !== PDF_MAGIC)
          throw ApiException.badRequest('syllabus.pdfOnly');
      } finally {
        await handle.close();
      }

      const row = await this.prisma.syllabusFile.create({
        data: {
          programId,
          fileName,
          sizeBytes: file.size,
          storageKey: 'pending',
          uploadedById: user.id,
        },
      });
      try {
        const upload = await open(file.path);
        await this.storage.put(quarantineKey(row.id), upload.createReadStream(), {
          size: file.size,
          contentType: 'application/pdf',
        });
      } catch {
        await this.prisma.syllabusFile.delete({ where: { id: row.id } });
        await this.storage.delete(quarantineKey(row.id)).catch(() => undefined);
        throw ApiException.badRequest('file.rejected');
      }
      const saved = await this.prisma.syllabusFile.update({
        where: { id: row.id },
        data: { storageKey: quarantineKey(row.id) },
      });
      await this.queue.add('scan', { fileId: row.id, target: 'syllabus' }, SCAN_JOB_OPTIONS);
      await this.audit.record({
        actorId: user.id,
        action: 'syllabus.uploaded',
        entity: 'syllabusFile',
        entityId: row.id,
        after: { programId, fileName, size: file.size },
        client,
      });
      return toView(saved);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async remove(user: AuthUser, fileId: string, client: ClientInfo): Promise<void> {
    const file = await this.prisma.syllabusFile.findUnique({ where: { id: fileId } });
    if (!file) throw ApiException.notFound();
    await this.teachLessons.programRecord(user, file.programId);
    await this.prisma.syllabusFile.delete({ where: { id: file.id } });
    if (file.storageKey !== 'pending')
      await this.storage.delete(file.storageKey).catch(() => undefined);
    await this.audit.record({
      actorId: user.id,
      action: 'syllabus.deleted',
      entity: 'syllabusFile',
      entityId: file.id,
      after: { programId: file.programId, fileName: file.fileName },
      client,
    });
  }

  /** Instructor or admin: a short-lived link to one clean version. */
  async teachDownloadUrl(user: AuthUser, fileId: string): Promise<string> {
    const file = await this.prisma.syllabusFile.findFirst({
      where: { id: fileId, scanStatus: 'clean' },
    });
    if (!file) throw ApiException.notFound();
    await this.teachLessons.programRecord(user, file.programId);
    return this.link(file);
  }

  /** Confirmed student of the program: a short-lived link to the current syllabus. */
  async studentDownloadUrl(user: AuthUser, programSlug: string): Promise<string> {
    const program = await this.prisma.program.findFirst({
      where: { slug: programSlug, deletedAt: null },
    });
    if (!program) throw ApiException.notFound();
    await this.studentLessons.access(user, program.id);
    const file = await this.prisma.syllabusFile.findFirst({
      where: { programId: program.id, scanStatus: 'clean' },
      orderBy: { createdAt: 'desc' },
    });
    if (!file) throw ApiException.notFound();
    return this.link(file);
  }

  private link(file: { storageKey: string; fileName: string }) {
    return this.storage.signedUrl(file.storageKey, {
      expiresInSeconds: DOWNLOAD_SECONDS,
      download: file.fileName,
    });
  }
}
