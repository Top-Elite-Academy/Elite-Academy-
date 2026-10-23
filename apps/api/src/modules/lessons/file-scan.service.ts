import { Injectable, Logger } from '@nestjs/common';
import { FileStorage } from '../../common/files/file-storage';
import { VirusScanner } from '../../common/files/virus-scanner';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { approvedKey, type FileScanJob, type ScanTarget } from './lesson-files.service';

/** Where a clean submission file lives. */
export const submissionFileKey = (submissionId: string, fileId: string) =>
  `submissions/${submissionId}/${fileId}`;

interface Scannable {
  id: string;
  storageKey: string;
  scanStatus: string;
  /** Where the file goes once clean */
  approvedKey: string;
  /** Recorded in the audit log when infected */
  owner: Record<string, string>;
}

/**
 * Scans one quarantined file (lesson material or a student's hand-in). Clean:
 * moved to its place and downloadable. Infected: deleted and recorded. Errors
 * are retried by the queue, then the file is marked failed (never downloadable).
 */
@Injectable()
export class FileScanService {
  private readonly logger = new Logger(FileScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorage,
    private readonly scanner: VirusScanner,
    private readonly audit: AuditService,
  ) {}

  private async find(target: ScanTarget, fileId: string): Promise<Scannable | null> {
    if (target === 'submission') {
      const file = await this.prisma.submissionFile.findUnique({ where: { id: fileId } });
      return (
        file && {
          ...file,
          approvedKey: submissionFileKey(file.submissionId, file.id),
          owner: { submissionId: file.submissionId },
        }
      );
    }
    const file = await this.prisma.lessonFile.findUnique({ where: { id: fileId } });
    return (
      file && {
        ...file,
        approvedKey: approvedKey(file.lessonId, file.id),
        owner: { lessonId: file.lessonId },
      }
    );
  }

  private async update(
    target: ScanTarget,
    fileId: string,
    data: { scanStatus: 'clean' | 'infected'; storageKey?: string; scanSignature?: string },
  ) {
    if (target === 'submission')
      await this.prisma.submissionFile.update({ where: { id: fileId }, data });
    else await this.prisma.lessonFile.update({ where: { id: fileId }, data });
  }

  async scan({ fileId, target = 'lesson' }: FileScanJob): Promise<void> {
    const file = await this.find(target, fileId);
    if (file?.scanStatus !== 'scanning') return;

    const result = await this.scanner.scan(await this.storage.read(file.storageKey));
    if (result.clean) {
      await this.storage.copy(file.storageKey, file.approvedKey);
      await this.update(target, file.id, { scanStatus: 'clean', storageKey: file.approvedKey });
      await this.storage.delete(file.storageKey);
      return;
    }

    await this.storage.delete(file.storageKey);
    await this.update(target, file.id, { scanStatus: 'infected', scanSignature: result.signature });
    await this.audit.record({
      actorId: null,
      action: target === 'submission' ? 'submissionFile.infected' : 'lessonFile.infected',
      entity: target === 'submission' ? 'submissionFile' : 'lessonFile',
      entityId: file.id,
      after: { ...file.owner, signature: result.signature },
    });
    this.logger.warn(`Infected upload removed (${target} file ${file.id}): ${result.signature}`);
  }

  /** The queue gave up: the file stays unavailable. */
  async markFailed({ fileId, target = 'lesson' }: FileScanJob): Promise<void> {
    const where = { id: fileId, scanStatus: 'scanning' as const };
    const data = { scanStatus: 'failed' as const };
    if (target === 'submission') await this.prisma.submissionFile.updateMany({ where, data });
    else await this.prisma.lessonFile.updateMany({ where, data });
  }
}
