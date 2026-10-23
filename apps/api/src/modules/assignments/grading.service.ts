import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import type {
  GradeInput,
  SubmissionFilter,
  TeachSubmission,
  TeachSubmissionList,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorage } from '../../common/files/file-storage';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TeachingService } from '../teaching/teaching.service';
import {
  readRubric,
  readScores,
  SUBMISSION_INCLUDE,
  type SubmissionRecord,
  toSubmissionSummary,
  toTeachSubmission,
} from './assignments.mapper';

/** Download links work for a few minutes only. */
const DOWNLOAD_SECONDS = 5 * 60;

const FILTERS: Record<SubmissionFilter, Prisma.SubmissionWhereInput> = {
  to_grade: { status: 'submitted' },
  returned: { status: 'returned' },
  all: {},
};

/**
 * Grading (design "Instructor 4"): the instructor scores each rubric criterion
 * and writes feedback as a draft; the student sees it only once returned.
 * An instructor grades only their own cohorts.
 */
@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teaching: TeachingService,
    private readonly storage: FileStorage,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async list(
    user: AuthUser,
    cohortId: string,
    filter: SubmissionFilter,
  ): Promise<TeachSubmissionList> {
    const cohort = await this.teaching.cohortRecord(user, cohortId);
    const [records, counts] = await Promise.all([
      this.prisma.submission.findMany({
        where: { cohortId, ...FILTERS[filter] },
        include: SUBMISSION_INCLUDE,
        // Oldest first: whoever waited longest is graded first.
        orderBy: { submittedAt: filter === 'returned' ? 'desc' : 'asc' },
      }),
      this.prisma.submission.groupBy({ by: ['status'], where: { cohortId }, _count: true }),
    ]);
    const count = (status: 'submitted' | 'returned') =>
      counts.find((row) => row.status === status)?._count ?? 0;
    return {
      cohort: { id: cohort.id, name: cohort.name },
      counts: { toGrade: count('submitted'), returned: count('returned') },
      items: records.map(toSubmissionSummary),
    };
  }

  /** A submission in one of the user's cohorts, or 404. */
  private async record(user: AuthUser, submissionId: string): Promise<SubmissionRecord> {
    const record = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: SUBMISSION_INCLUDE,
    });
    if (!record) throw ApiException.notFound();
    await this.teaching.cohortRecord(user, record.cohortId);
    return record;
  }

  async get(user: AuthUser, submissionId: string): Promise<TeachSubmission> {
    return toTeachSubmission(await this.record(user, submissionId));
  }

  /** Saves a draft grade. Points are checked against the rubric on the server. */
  async grade(
    user: AuthUser,
    submissionId: string,
    input: GradeInput,
    client: ClientInfo,
  ): Promise<TeachSubmission> {
    const record = await this.record(user, submissionId);
    if (record.status === 'returned') throw ApiException.conflict('grade.alreadyReturned');
    const rubric = readRubric(record.assignment.rubric);
    for (const score of input.scores) {
      const criterion = rubric.find((row) => row.id === score.criterionId);
      if (!criterion) throw ApiException.badRequest('grade.unknownCriterion');
      if (score.points !== null && score.points > criterion.maxPoints)
        throw ApiException.badRequest('grade.tooManyPoints');
    }
    const scores = readScores(input.scores, rubric);
    const given = scores.filter((score) => score.points !== null);
    const updated = await this.prisma.submission.update({
      where: { id: record.id },
      data: {
        scores: scores as unknown as Prisma.InputJsonArray,
        feedback: input.feedback,
        score: given.length ? given.reduce((sum, score) => sum + (score.points ?? 0), 0) : null,
        gradedById: user.id,
        gradedAt: new Date(),
      },
      include: SUBMISSION_INCLUDE,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'submission.graded',
      entity: 'submission',
      entityId: record.id,
      after: { score: updated.score },
      client,
    });
    return toTeachSubmission(updated);
  }

  /** Releases the grade: the student is notified (bell, live and email). */
  async returnToStudent(
    user: AuthUser,
    submissionId: string,
    client: ClientInfo,
  ): Promise<TeachSubmission> {
    const record = await this.record(user, submissionId);
    if (record.status === 'returned') throw ApiException.conflict('grade.alreadyReturned');
    const scores = readScores(record.scores, readRubric(record.assignment.rubric));
    if (record.score === null || scores.some((score) => score.points === null))
      throw ApiException.badRequest('grade.incomplete');

    const returned = await this.prisma.submission.update({
      where: { id: record.id },
      data: { status: 'returned', returnedAt: new Date() },
      include: SUBMISSION_INCLUDE,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'submission.returned',
      entity: 'submission',
      entityId: record.id,
      after: { score: record.score },
      client,
    });
    await this.tellStudent(returned);
    return toTeachSubmission(returned);
  }

  private async tellStudent(record: SubmissionRecord): Promise<void> {
    const [student, program] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: record.userId } }),
      this.prisma.program.findUniqueOrThrow({
        where: { id: record.assignment.lesson.programId },
        select: { slug: true },
      }),
    ]);
    const score = record.score ?? 0;
    await this.notifications.notify([student.id], {
      type: 'submission_returned',
      data: {
        submissionId: record.id,
        lessonId: record.assignment.lesson.id,
        programSlug: program.slug,
        title: record.assignment.title,
        score,
      },
    });
    await this.mail.send({
      to: student.email,
      locale: student.locale,
      template: 'feedbackReturned',
      params: {
        firstName: student.firstName,
        title: record.assignment.title,
        score,
        link: `${this.config.http.webOrigin}/${student.locale}/app/courses/${program.slug}/lessons/${record.assignment.lesson.id}`,
      },
    });
  }

  /** A short-lived link to a clean file of a submission in the user's cohort. */
  async downloadUrl(user: AuthUser, submissionId: string, fileId: string): Promise<string> {
    const record = await this.record(user, submissionId);
    return fileLink(this.storage, record, fileId);
  }
}

/** Signed link to a clean file of the submission, or 404. */
export function fileLink(
  storage: FileStorage,
  record: Pick<SubmissionRecord, 'files'>,
  fileId: string,
): Promise<string> {
  const file = record.files.find((item) => item.id === fileId && item.scanStatus === 'clean');
  if (!file) throw ApiException.notFound();
  return storage.signedUrl(file.storageKey, {
    expiresInSeconds: DOWNLOAD_SECONDS,
    download: file.fileName,
  });
}
