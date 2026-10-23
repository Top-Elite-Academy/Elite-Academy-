import { open, unlink } from 'node:fs/promises';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  ALLOWED_FILE_TYPES,
  assignmentDueAt,
  extensionOf,
  lateDays,
  MAX_FILE_BYTES,
  MAX_SUBMISSION_FILES,
  type StudentAssignment,
  type SubmitWorkInput,
} from '@eta/shared';
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
import {
  isoDate,
  readRubric,
  readScores,
  SUBMISSION_INCLUDE,
  toSubmissionFileView,
} from './assignments.mapper';
import { fileLink } from './grading.service';

/**
 * A student hands in the exercise of a lesson they can open: a GitHub link
 * and/or files (virus-scanned before anyone downloads them). Late work is
 * accepted and marked late; after the grade is returned the work is final.
 */
@Injectable()
export class StudentSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessons: StudentLessonsService,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
    @InjectQueue(FILE_SCAN_QUEUE) private readonly queue: Queue<FileScanJob>,
  ) {}

  /** The open lesson's exercise and the student's cohort, or 404. */
  private async context(user: AuthUser, lessonId: string) {
    const lesson = await this.lessons.openLesson(user, lessonId);
    const assignment = await this.prisma.assignment.findUnique({ where: { lessonId: lesson.id } });
    if (!assignment) throw ApiException.notFound();
    const { cohort } = await this.lessons.access(user, lesson.programId);
    return {
      assignment,
      cohort,
      dueAt: assignmentDueAt(isoDate(cohort.startDate), assignment.dueWeek),
    };
  }

  async get(user: AuthUser, lessonId: string): Promise<StudentAssignment> {
    const { assignment, dueAt } = await this.context(user, lessonId);
    const submission = await this.prisma.submission.findUnique({
      where: { assignmentId_userId: { assignmentId: assignment.id, userId: user.id } },
      include: { files: { orderBy: { createdAt: 'asc' } } },
    });
    const rubric = readRubric(assignment.rubric);
    return {
      id: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      dueAt: dueAt.toISOString(),
      rubric,
      submission: submission && {
        id: submission.id,
        repoUrl: submission.repoUrl,
        note: submission.note,
        submittedAt: submission.submittedAt.toISOString(),
        lateDays: lateDays(dueAt, submission.submittedAt),
        status: submission.status,
        // Infected or failed files are not shown back; the student sees what counts.
        files: submission.files
          .filter((file) => file.scanStatus === 'scanning' || file.scanStatus === 'clean')
          .map(toSubmissionFileView),
        grade:
          submission.status === 'returned' && submission.score !== null && submission.returnedAt
            ? {
                score: submission.score,
                scores: readScores(submission.scores, rubric),
                feedback: submission.feedback,
                returnedAt: submission.returnedAt.toISOString(),
              }
            : null,
      },
    };
  }

  /** Hands in (or updates) the work. New files are added to the ones already there. */
  async submit(
    user: AuthUser,
    lessonId: string,
    input: SubmitWorkInput,
    files: ReceivedFile[],
    client: ClientInfo,
  ): Promise<StudentAssignment> {
    try {
      const { assignment, cohort } = await this.context(user, lessonId);
      const existing = await this.prisma.submission.findUnique({
        where: { assignmentId_userId: { assignmentId: assignment.id, userId: user.id } },
        include: { files: { where: { scanStatus: { in: ['scanning', 'clean'] } } } },
      });
      if (existing?.status === 'returned') throw ApiException.conflict('submission.returned');
      const kept = existing?.files.length ?? 0;
      if (kept + files.length > MAX_SUBMISSION_FILES)
        throw ApiException.badRequest('submission.tooManyFiles');
      if (!input.repoUrl && kept + files.length === 0)
        throw ApiException.badRequest('submission.empty');
      const checked = files.map((file) => checkFile(file));

      const submission = await this.prisma.submission.upsert({
        where: { assignmentId_userId: { assignmentId: assignment.id, userId: user.id } },
        create: {
          assignmentId: assignment.id,
          userId: user.id,
          cohortId: cohort.id,
          repoUrl: input.repoUrl,
          note: input.note,
          submittedAt: new Date(),
        },
        update: { repoUrl: input.repoUrl, note: input.note, submittedAt: new Date() },
      });
      for (const file of checked) await this.store(submission.id, file);
      await this.audit.record({
        actorId: user.id,
        action: existing ? 'submission.updated' : 'submission.created',
        entity: 'submission',
        entityId: submission.id,
        after: { lessonId, files: files.length, repo: Boolean(input.repoUrl) },
        client,
      });
      return await this.get(user, lessonId);
    } finally {
      await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
    }
  }

  /** Quarantine, then the background scan (same queue as lesson files). */
  private async store(submissionId: string, file: CheckedFile): Promise<void> {
    const row = await this.prisma.submissionFile.create({
      data: {
        submissionId,
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
      await this.prisma.submissionFile.delete({ where: { id: row.id } });
      await this.storage.delete(quarantineKey(row.id)).catch(() => undefined);
      throw ApiException.badRequest('file.rejected');
    }
    await this.prisma.submissionFile.update({
      where: { id: row.id },
      data: { storageKey: quarantineKey(row.id) },
    });
    await this.queue.add('scan', { fileId: row.id, target: 'submission' }, SCAN_JOB_OPTIONS);
  }

  /** The student's own submission, while it can still change. */
  private async ownSubmission(user: AuthUser, submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, userId: user.id },
      include: SUBMISSION_INCLUDE,
    });
    if (!submission) throw ApiException.notFound();
    return submission;
  }

  async removeFile(
    user: AuthUser,
    submissionId: string,
    fileId: string,
    client: ClientInfo,
  ): Promise<void> {
    const submission = await this.ownSubmission(user, submissionId);
    if (submission.status === 'returned') throw ApiException.conflict('submission.returned');
    const file = submission.files.find((item) => item.id === fileId);
    if (!file) throw ApiException.notFound();
    const others = submission.files.filter(
      (item) => item.id !== fileId && ['scanning', 'clean'].includes(item.scanStatus),
    );
    // A hand-in always keeps something: the link or a file.
    if (!submission.repoUrl && others.length === 0)
      throw ApiException.badRequest('submission.empty');
    await this.prisma.submissionFile.delete({ where: { id: file.id } });
    if (file.storageKey !== 'pending')
      await this.storage.delete(file.storageKey).catch(() => undefined);
    await this.audit.record({
      actorId: user.id,
      action: 'submissionFile.deleted',
      entity: 'submissionFile',
      entityId: file.id,
      after: { submissionId, fileName: file.fileName },
      client,
    });
  }

  async downloadUrl(user: AuthUser, submissionId: string, fileId: string): Promise<string> {
    return fileLink(this.storage, await this.ownSubmission(user, submissionId), fileId);
  }
}

interface CheckedFile extends ReceivedFile {
  fileName: string;
  contentType: string;
}

/** Same rules as lesson files: allowed types and size. */
function checkFile(file: ReceivedFile): CheckedFile {
  const fileName = safeFileName(file.originalname);
  const contentType = ALLOWED_FILE_TYPES[extensionOf(fileName)];
  if (!contentType) throw ApiException.badRequest('file.type');
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw ApiException.badRequest('file.tooLarge');
  return { ...file, fileName, contentType };
}
