import type { Prisma } from '@eta/db';
import {
  assignmentDueAt,
  type CriterionScore,
  lateDays,
  type RubricCriterion,
  type SubmissionFileView,
  type SubmissionSummary,
  type TeachSubmission,
} from '@eta/shared';

/** The rubric as stored (validated on the way in). */
export const readRubric = (value: Prisma.JsonValue): RubricCriterion[] =>
  value as unknown as RubricCriterion[];

/** Saved scores, lined up with the current rubric (a removed criterion drops out). */
export function readScores(value: Prisma.JsonValue | null, rubric: RubricCriterion[]) {
  const saved = (value ?? []) as unknown as CriterionScore[];
  return rubric.map(
    (criterion): CriterionScore =>
      saved.find((score) => score.criterionId === criterion.id) ?? {
        criterionId: criterion.id,
        points: null,
        comment: '',
      },
  );
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const SUBMISSION_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true } },
  cohort: { select: { id: true, name: true, startDate: true } },
  assignment: { include: { lesson: { select: { id: true, position: true, programId: true } } } },
  files: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.SubmissionInclude;

export type SubmissionRecord = Prisma.SubmissionGetPayload<{ include: typeof SUBMISSION_INCLUDE }>;

export const dueAtFor = (record: SubmissionRecord) =>
  assignmentDueAt(isoDate(record.cohort.startDate), record.assignment.dueWeek);

export const toSubmissionFileView = (
  file: SubmissionRecord['files'][number],
): SubmissionFileView => ({
  id: file.id,
  fileName: file.fileName,
  sizeBytes: file.sizeBytes,
  scanStatus: file.scanStatus,
});

export const toSubmissionSummary = (record: SubmissionRecord): SubmissionSummary => ({
  id: record.id,
  student: {
    userId: record.user.id,
    firstName: record.user.firstName,
    lastName: record.user.lastName,
  },
  assignment: {
    id: record.assignment.id,
    title: record.assignment.title,
    lessonPosition: record.assignment.lesson.position,
  },
  submittedAt: record.submittedAt.toISOString(),
  lateDays: lateDays(dueAtFor(record), record.submittedAt),
  status: record.status,
  score: record.score,
});

export function toTeachSubmission(record: SubmissionRecord): TeachSubmission {
  const rubric = readRubric(record.assignment.rubric);
  return {
    ...toSubmissionSummary(record),
    cohort: { id: record.cohort.id, name: record.cohort.name },
    dueAt: dueAtFor(record).toISOString(),
    repoUrl: record.repoUrl,
    note: record.note,
    files: record.files.map(toSubmissionFileView),
    rubric,
    scores: readScores(record.scores, rubric),
    feedback: record.feedback,
    gradedAt: record.gradedAt?.toISOString() ?? null,
    returnedAt: record.returnedAt?.toISOString() ?? null,
  };
}
