import { z } from 'zod';
import { addDays, zonedToUtc } from '../time-zone';
import type { LessonFileView } from './lessons';

/**
 * Exercises students hand in, and grading with a rubric (design "Instructor 4").
 * Late work is accepted and shown as late; the student sees the grade only
 * after the instructor returns it.
 */

export const ASSIGNMENT_TITLE_MAX = 200;
export const ASSIGNMENT_INSTRUCTIONS_MAX = 5000;
export const RUBRIC_MAX_CRITERIA = 10;
/** The points of a rubric always add up to this. */
export const RUBRIC_TOTAL = 100;
export const SUBMISSION_NOTE_MAX = 2000;
export const FEEDBACK_MAX = 5000;
export const CRITERION_COMMENT_MAX = 1000;
/** Files per hand-in (each up to MAX_FILE_BYTES, scanned like lesson files). */
export const MAX_SUBMISSION_FILES = 5;

/** Week deadlines are in Jerusalem time, like the cohort's classes. */
const DEADLINE_TIME_ZONE = 'Asia/Jerusalem';

/** End of the cohort's week N (the last day of that week, 23:59 Jerusalem). */
export function assignmentDueAt(cohortStartDate: string, dueWeek: number): Date {
  return zonedToUtc(addDays(cohortStartDate, dueWeek * 7 - 1), '23:59', DEADLINE_TIME_ZONE);
}

/** Whole days after the deadline, counting a started day; 0 when on time. */
export function lateDays(dueAt: Date, submittedAt: Date): number {
  const late = submittedAt.getTime() - dueAt.getTime();
  return late <= 0 ? 0 : Math.ceil(late / 86_400_000);
}

const criterionSchema = z.object({
  /** Kept when a rubric is edited, so draft grades still match; new rows get one on the server. */
  id: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .optional(),
  title: z
    .string()
    .trim()
    .min(1, { error: 'assignment.criterionRequired' })
    .max(120, { error: 'assignment.criterionTooLong' }),
  maxPoints: z.number().int().min(1).max(RUBRIC_TOTAL),
});

export const saveAssignmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'assignment.titleRequired' })
    .max(ASSIGNMENT_TITLE_MAX, { error: 'assignment.titleTooLong' }),
  instructions: z
    .string()
    .trim()
    .max(ASSIGNMENT_INSTRUCTIONS_MAX, { error: 'assignment.instructionsTooLong' }),
  dueWeek: z.number().int().min(1).max(104),
  rubric: z
    .array(criterionSchema)
    .min(1, { error: 'assignment.rubricRequired' })
    .max(RUBRIC_MAX_CRITERIA, { error: 'assignment.rubricTooLong' })
    .refine((rows) => rows.reduce((sum, row) => sum + row.maxPoints, 0) === RUBRIC_TOTAL, {
      error: 'assignment.rubricTotal',
    }),
});
export type SaveAssignmentInput = z.infer<typeof saveAssignmentSchema>;

/** https://github.com/owner/repo… only (the decision: a GitHub link). */
export const isGitHubUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      url.pathname.split('/').filter(Boolean).length >= 2
    );
  } catch {
    return false;
  }
};

/** The text fields of a hand-in (files come in the same multipart request). */
export const submitWorkSchema = z.object({
  repoUrl: z
    .string()
    .trim()
    .max(500)
    // Multipart forms leave out empty fields.
    .default('')
    .refine((value) => value === '' || isGitHubUrl(value), { error: 'submission.repoUrl' })
    .transform((value) => value || null),
  note: z
    .string()
    .trim()
    .max(SUBMISSION_NOTE_MAX, { error: 'submission.noteTooLong' })
    .default(''),
});
export type SubmitWorkInput = z.infer<typeof submitWorkSchema>;

export const gradeSchema = z.object({
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1).max(40),
        points: z.number().int().min(0).max(RUBRIC_TOTAL).nullable(),
        comment: z.string().trim().max(CRITERION_COMMENT_MAX, { error: 'grade.commentTooLong' }),
      }),
    )
    .max(RUBRIC_MAX_CRITERIA),
  feedback: z.string().trim().max(FEEDBACK_MAX, { error: 'grade.feedbackTooLong' }),
});
export type GradeInput = z.infer<typeof gradeSchema>;

export const submissionFilterSchema = z.enum(['to_grade', 'returned', 'all']);
export type SubmissionFilter = z.infer<typeof submissionFilterSchema>;

export interface RubricCriterion {
  id: string;
  title: string;
  maxPoints: number;
}

export interface CriterionScore {
  criterionId: string;
  points: number | null;
  comment: string;
}

/** Instructor: the exercise of a lesson. */
export interface AssignmentView {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  dueWeek: number;
  rubric: RubricCriterion[];
  /** Hand-ins so far; the rubric can still change (draft grades are kept by criterion id). */
  submissionCount: number;
}

export type SubmissionStatus = 'submitted' | 'returned';
export type SubmissionFileView = Omit<LessonFileView, 'kind'>;

/** One row of the grading list. */
export interface SubmissionSummary {
  id: string;
  student: { userId: string; firstName: string; lastName: string };
  assignment: { id: string; title: string; lessonPosition: number };
  submittedAt: string;
  lateDays: number;
  status: SubmissionStatus;
  /** Saved (draft or returned) total */
  score: number | null;
}

export interface TeachSubmissionList {
  cohort: { id: string; name: string };
  counts: { toGrade: number; returned: number };
  items: SubmissionSummary[];
}

/** The grading panel. */
export interface TeachSubmission extends SubmissionSummary {
  cohort: { id: string; name: string };
  dueAt: string;
  repoUrl: string | null;
  note: string;
  files: SubmissionFileView[];
  rubric: RubricCriterion[];
  scores: CriterionScore[];
  feedback: string;
  gradedAt: string | null;
  returnedAt: string | null;
}

/** Student: the exercise under a lesson and their own hand-in. */
export interface StudentAssignment {
  id: string;
  title: string;
  instructions: string;
  /** End of the due week in the student's cohort */
  dueAt: string;
  rubric: RubricCriterion[];
  submission: {
    id: string;
    repoUrl: string | null;
    note: string;
    submittedAt: string;
    lateDays: number;
    status: SubmissionStatus;
    files: SubmissionFileView[];
    /** Only once returned */
    grade: { score: number; scores: CriterionScore[]; feedback: string; returnedAt: string } | null;
  } | null;
}
