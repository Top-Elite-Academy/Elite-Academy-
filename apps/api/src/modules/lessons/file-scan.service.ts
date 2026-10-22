import { Injectable, Logger } from '@nestjs/common';
import { FileStorage } from '../../common/files/file-storage';
import { VirusScanner } from '../../common/files/virus-scanner';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { approvedKey } from './lesson-files.service';

/**
 * Scans one quarantined file. Clean: moved to its lesson and downloadable.
 * Infected: deleted and recorded. Errors are retried by the queue, then the
 * file is marked failed (never downloadable).
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

  async scan(fileId: string): Promise<void> {
    const file = await this.prisma.lessonFile.findUnique({ where: { id: fileId } });
    if (file?.scanStatus !== 'scanning') return;

    const result = await this.scanner.scan(await this.storage.read(file.storageKey));
    if (result.clean) {
      const key = approvedKey(file.lessonId, file.id);
      await this.storage.copy(file.storageKey, key);
      await this.prisma.lessonFile.update({
        where: { id: file.id },
        data: { scanStatus: 'clean', storageKey: key },
      });
      await this.storage.delete(file.storageKey);
      return;
    }

    await this.storage.delete(file.storageKey);
    await this.prisma.lessonFile.update({
      where: { id: file.id },
      data: { scanStatus: 'infected', scanSignature: result.signature },
    });
    await this.audit.record({
      actorId: null,
      action: 'lessonFile.infected',
      entity: 'lessonFile',
      entityId: file.id,
      after: { lessonId: file.lessonId, signature: result.signature },
    });
    this.logger.warn(`Infected upload removed (file ${file.id}): ${result.signature}`);
  }

  /** The queue gave up: the file stays unavailable. */
  async markFailed(fileId: string): Promise<void> {
    await this.prisma.lessonFile.updateMany({
      where: { id: fileId, scanStatus: 'scanning' },
      data: { scanStatus: 'failed' },
    });
  }
}
