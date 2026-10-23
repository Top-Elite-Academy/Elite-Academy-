import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { FileScanService } from './file-scan.service';
import { FILE_SCAN_QUEUE, type FileScanJob } from './lesson-files.service';

/** Runs virus scans in the background (BullMQ); retried on errors. */
@Processor(FILE_SCAN_QUEUE)
export class FileScanProcessor extends WorkerHost {
  constructor(private readonly scans: FileScanService) {
    super();
  }

  async process(job: Job<FileScanJob>): Promise<void> {
    await this.scans.scan(job.data);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<FileScanJob>): Promise<void> {
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) await this.scans.markFailed(job.data);
  }
}
