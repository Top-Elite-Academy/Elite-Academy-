import { z } from 'zod';
import type { CohortSchedule } from '../content';
import type { AttendanceSummary, ProgressStatus } from './progress';

/** Teaching (instructor milestone 1): enrollments, announcements, notifications. */

export const requestEnrollmentSchema = z.object({
  cohortId: z.uuid({ error: 'cohort.invalid' }),
});
export type RequestEnrollmentInput = z.infer<typeof requestEnrollmentSchema>;

export const ANNOUNCEMENT_TITLE_MAX = 140;
export const ANNOUNCEMENT_BODY_MAX = 4000;

export const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'announcement.titleRequired' })
    .max(ANNOUNCEMENT_TITLE_MAX, { error: 'announcement.titleTooLong' }),
  body: z
    .string()
    .trim()
    .min(1, { error: 'announcement.bodyRequired' })
    .max(ANNOUNCEMENT_BODY_MAX, { error: 'announcement.bodyTooLong' }),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const markNotificationsReadSchema = z.object({
  /** Omit to mark everything read. */
  ids: z.array(z.uuid()).max(100).optional(),
});

export type EnrollmentStatus = 'pending' | 'confirmed' | 'withdrawn';

export interface CohortRef {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  startDate: string;
  schedule: CohortSchedule | null;
  program: { slug: string; title: string; lengthWeeks: number | null };
}

export interface AnnouncementView {
  id: string;
  cohortId: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
}

/** A student's own enrollment (student area "My courses"). */
export interface StudentEnrollment {
  id: string;
  status: EnrollmentStatus;
  cohort: CohortRef;
  instructorName: string | null;
  /** Latest announcements, only once confirmed. */
  announcements: AnnouncementView[];
  /** The student's own attendance, once confirmed. */
  attendance: AttendanceSummary | null;
}

/** A cohort the instructor teaches. */
export interface TeachCohort extends CohortRef {
  status: 'open' | 'full' | 'running' | 'finished';
  seatsTotal: number;
  confirmed: number;
  pending: number;
  /** "Week 12 of 24" while running; null before the start or without a length. */
  week: { current: number; total: number | null } | null;
}

export interface CohortStudent {
  enrollmentId: string;
  userId: string;
  firstName: string;
  lastName: string;
  status: EnrollmentStatus;
  /** When the student chose the cohort */
  requestedAt: string;
  confirmedAt: string | null;
  attendance: AttendanceSummary;
  /** On track / Behind / At risk (null: not enough classes yet) */
  progress: ProgressStatus | null;
  lastActiveAt: string | null;
}

export interface TeachScheduleItem {
  kind: 'liveClass' | 'mentoring' | 'career';
  startAt: string;
  endAt: string;
  /** Cohort for a live class; student name for a session */
  title: string;
  cohortId: string | null;
  bookingId: string | null;
  /** Mentoring package code, e.g. "mentoring-8" */
  service: string | null;
}

export interface TeachToday {
  cohorts: TeachCohort[];
  stats: {
    students: number;
    pending: number;
    sessionsThisWeek: number;
    /** Hand-ins waiting for a grade */
    toGrade: number;
    /** Average attendance of confirmed students with marked classes, 0-100 */
    averageAttendance: number | null;
  };
  /** Today and tomorrow, Jerusalem time. */
  schedule: TeachScheduleItem[];
  announcements: AnnouncementView[];
  /** Students at risk or behind (attendance), at risk first */
  needsAttention: AttentionItem[];
  /** The oldest hand-ins waiting for a grade */
  toGrade: GradeQueueItem[];
}

/** "Needs your attention" (design "Instructor 1"). */
export interface AttentionItem {
  userId: string;
  firstName: string;
  lastName: string;
  cohortId: string;
  cohortName: string;
  status: 'behind' | 'at_risk';
  /** Attendance, 0-100 */
  rate: number;
}

/** "Submissions to grade" (design "Instructor 1"). */
export interface GradeQueueItem {
  id: string;
  cohortId: string;
  student: { firstName: string; lastName: string };
  title: string;
  submittedAt: string;
  lateDays: number;
}

/** For admin and sales: who is waiting to be confirmed. */
export interface PendingEnrollment {
  id: string;
  student: { firstName: string; lastName: string; email: string };
  cohort: { id: string; name: string; programTitle: string };
  requestedAt: string;
}

export type NotificationView =
  | {
      id: string;
      type: 'announcement';
      data: { cohortId: string; cohortName: string; title: string; announcementId: string };
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: 'enrollment_confirmed';
      data: { cohortId: string; cohortName: string; programTitle: string };
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: 'session_booked' | 'session_cancelled' | 'session_rescheduled' | 'session_notes';
      data: SessionNotificationData;
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: 'submission_returned';
      data: {
        submissionId: string;
        lessonId: string;
        programSlug: string;
        title: string;
        score: number;
      };
      readAt: string | null;
      createdAt: string;
    };

/** About one session; "audience" decides whether the link opens the student or mentor page. */
export interface SessionNotificationData {
  bookingId: string;
  audience: 'student' | 'mentor';
  /** The other person: the student for a mentor, the mentor for a student */
  name: string;
  startAt: string;
  previousStartAt?: string;
}

export interface NotificationsResponse {
  items: NotificationView[];
  unread: number;
}
