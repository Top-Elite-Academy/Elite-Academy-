import { z } from 'zod';

/**
 * Assignment discussions (spec §4.11): classmates of one cohort ask and answer
 * questions about an exercise; the cohort's instructor moderates. Posts are
 * plain text; a ``` fence marks a code block.
 */

export const DISCUSSION_TITLE_MAX = 120;
export const DISCUSSION_BODY_MAX = 4000;
export const REPORT_REASON_MAX = 500;

const body = z
  .string()
  .trim()
  .min(1, { error: 'discussion.bodyRequired' })
  .max(DISCUSSION_BODY_MAX, { error: 'discussion.bodyTooLong' });

/** A student opens a question under an exercise. */
export const askQuestionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'discussion.titleRequired' })
    .max(DISCUSSION_TITLE_MAX, { error: 'discussion.titleTooLong' }),
  body,
});
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const discussionReplySchema = z.object({ body });
export type DiscussionReplyInput = z.infer<typeof discussionReplySchema>;

/** Instructor only: pin the question, or mark a reply as the answer (null clears it). */
export const moderateThreadSchema = z.object({
  pinned: z.boolean().optional(),
  answerReplyId: z.uuid().nullable().optional(),
});
export type ModerateThreadInput = z.infer<typeof moderateThreadSchema>;

/** A student flags a post for the instructor; the reason is optional. */
export const reportPostSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(REPORT_REASON_MAX, { error: 'discussion.reasonTooLong' })
    .default(''),
});
export type ReportPostInput = z.infer<typeof reportPostSchema>;

/** Students see classmates as "Maya R."; staff are labelled as the instructor. */
export interface DiscussionAuthor {
  name: string;
  role: 'student' | 'staff';
  isMe: boolean;
}

export type DiscussionRemoved = 'author' | 'staff' | null;

/** One question in a list. */
export interface DiscussionSummary {
  id: string;
  title: string;
  author: DiscussionAuthor;
  pinned: boolean;
  answered: boolean;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
  /** Only staff see removed questions; students never get them. */
  removed: DiscussionRemoved;
  /** Open reports — staff only (null for students). */
  openReports: number | null;
  assignment: { id: string; title: string; lessonId: string };
}

/** The question or a reply. "body" is null when a student looks at a removed post. */
export interface DiscussionPost {
  id: string;
  body: string | null;
  author: DiscussionAuthor;
  createdAt: string;
  removed: DiscussionRemoved;
  /** Staff only (null for students). */
  openReports: number | null;
  canDelete: boolean;
  canReport: boolean;
}

export interface DiscussionThreadView {
  id: string;
  title: string;
  question: DiscussionPost;
  replies: DiscussionPost[];
  pinned: boolean;
  answerReplyId: string | null;
  /** The reader is the cohort's instructor or an admin. */
  moderator: boolean;
  canReply: boolean;
  context: {
    cohortId: string;
    cohortName: string;
    lessonId: string;
    programSlug: string;
    assignmentTitle: string;
  };
}

/** The discussion under a lesson's exercise, for a student. */
export interface StudentDiscussion {
  assignment: { id: string; title: string };
  threads: DiscussionSummary[];
}

/** Which notification links where: the student pages or the instructor pages. */
export interface DiscussionNotificationData {
  threadId: string;
  title: string;
  /** Who asked, replied or reported */
  name: string;
  audience: 'student' | 'staff';
  cohortId: string;
  lessonId: string;
  programSlug: string;
}
