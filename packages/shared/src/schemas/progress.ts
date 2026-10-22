import { z } from 'zod';
import type { CohortRef, EnrollmentStatus } from './teaching';

/** Progress & attendance (designs "Instructor 2–3"). */

export const ATTENDANCE_STATUSES = ['present', 'late', 'absent'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** How many past classes the attendance views show. */
export const RECENT_CLASSES = 10;
export const STUDENT_NOTE_MAX = 1000;

export const saveAttendanceSchema = z.object({
  date: z.iso.date({ error: 'date.invalid' }),
  marks: z.array(z.object({ userId: z.uuid(), status: z.enum(ATTENDANCE_STATUSES) })).max(200),
});
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;

export const studentNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: 'note.required' })
    .max(STUDENT_NOTE_MAX, { error: 'note.tooLong' }),
  sharedWithAdmissions: z.boolean().default(false),
});
export type StudentNoteInput = z.infer<typeof studentNoteSchema>;

export type ProgressStatus = 'on_track' | 'behind' | 'at_risk';

/**
 * Status from attendance (present or late counts as attended). Too few marked
 * classes gives no status rather than a misleading one. Progress and late work
 * join this rule when lessons and grading exist.
 */
export function progressStatus(attended: number, marked: number): ProgressStatus | null {
  if (marked < 3) return null;
  const rate = attended / marked;
  if (rate >= 0.85) return 'on_track';
  if (rate >= 0.7) return 'behind';
  return 'at_risk';
}

/** Attendance tab: one class day, every confirmed student. */
export interface CohortAttendance {
  /** Past class days (YYYY-MM-DD), newest first */
  classes: string[];
  /** The day shown; null when no class has happened yet */
  date: string | null;
  students: {
    userId: string;
    firstName: string;
    lastName: string;
    status: AttendanceStatus | null;
  }[];
}

export interface AttendanceSummary {
  attended: number;
  marked: number;
  /** 0–100, null when nothing is marked yet */
  rate: number | null;
}

export interface StudentNoteView {
  id: string;
  body: string;
  authorName: string;
  sharedWithAdmissions: boolean;
  createdAt: string;
}

/** The student page for instructors (design "Instructor 3"). No contact or payment details. */
export interface StudentProgress {
  student: { userId: string; firstName: string; lastName: string };
  cohort: CohortRef;
  enrollment: { status: EnrollmentStatus; requestedAt: string; confirmedAt: string | null };
  attendance: AttendanceSummary & {
    recent: { date: string; status: AttendanceStatus | null }[];
  };
  status: ProgressStatus | null;
  lastActiveAt: string | null;
  mentoringPlan: {
    total: number;
    used: number;
    lastSession: { startAt: string; notes: string | null } | null;
  } | null;
  notes: StudentNoteView[];
}
