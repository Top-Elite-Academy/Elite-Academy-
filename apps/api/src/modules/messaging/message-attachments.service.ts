import { open, unlink } from 'node:fs/promises';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  extensionOf,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MESSAGE_FILE_TYPES,
} from '@eta/shared';
import type { Queue } from 'bullmq';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorage } from '../../common/files/file-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  FILE_SCAN_QUEUE,
  type FileScanJob,
  quarantineKey,
  type ReceivedFile,
  SCAN_JOB_OPTIONS,
  safeFileName,
} from '../lessons/lesson-files.service';

interface CheckedFile extends ReceivedFile {
  fileName: string;
  contentType: string;
}

/**
 * Files sent with messages (spec §4.9 and §9): allowed types, 10 MB each,
 * quarantined and virus-scanned before anyone can download them.
 */
@Injectable()
export class MessageAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorage,
    @InjectQueue(FILE_SCAN_QUEUE) private readonly queue: Queue<FileScanJob>,
  ) {}

  check(files: ReceivedFile[]): CheckedFile[] {
    if (files.length > MAX_ATTACHMENTS) throw ApiException.badRequest('message.tooManyFiles');
    return files.map((file) => {
      const fileName = safeFileName(file.originalname);
      const contentType = MESSAGE_FILE_TYPES[extensionOf(fileName)];
      if (!contentType) throw ApiException.badRequest('file.type');
      if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES)
        throw ApiException.badRequest('message.fileTooLarge');
      return { ...file, fileName, contentType };
    });
  }

  async store(messageId: string, file: CheckedFile): Promise<void> {
    const row = await this.prisma.messageAttachment.create({
      data: {
        messageId,
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.size,
        storageKey: 'pending',
      },
    });
    try {
      const handle = await open(file.path);
      await this.storage.put(quarantineKey(row.id), handle.createReadStream(), {
        size: file.size,
        contentType: file.contentType,
      });
    } catch {
      await this.prisma.messageAttachment.delete({ where: { id: row.id } });
      await this.storage.delete(quarantineKey(row.id)).catch(() => undefined);
      throw ApiException.badRequest('file.rejected');
    }
    await this.prisma.messageAttachment.update({
      where: { id: row.id },
      data: { storageKey: quarantineKey(row.id) },
    });
    await this.queue.add('scan', { fileId: row.id, target: 'message' }, SCAN_JOB_OPTIONS);
  }

  /** The temporary uploads are always removed. */
  async cleanUp(files: ReceivedFile[]): Promise<void> {
    await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
  }
}
