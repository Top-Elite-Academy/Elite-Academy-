import { z } from 'zod';

/**
 * Messages & support (spec §4.9): threads between a student and their
 * instructors/mentors, the Support team or the Payments team.
 */

export const MESSAGE_MAX = 2000;
export const SUBJECT_MAX = 120;
/** Attachments: images, PDF and code files up to 10 MB each, virus-scanned. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;
/** Email about an unread message after this long. */
export const UNREAD_EMAIL_MINUTES = 30;

export const MESSAGE_FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  ipynb: 'application/x-ipynb+json',
  py: 'text/x-python',
  js: 'text/javascript',
  ts: 'text/plain',
  tsx: 'text/plain',
  sql: 'text/plain',
  zip: 'application/zip',
};

export const teamSchema = z.enum(['support', 'payments']);
export type Team = z.infer<typeof teamSchema>;

const body = z
  .string()
  .trim()
  .max(MESSAGE_MAX, { error: 'message.tooLong' })
  // Multipart forms leave out empty fields; a message may be only attachments.
  .default('');

/** Text of a message (attachments come in the same multipart request). */
export const sendMessageSchema = z.object({ body });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * A new thread. "to" is a staff user id (students), a team (students), or a
 * student id (staff). The server checks it against the allowed list.
 */
export const startConversationSchema = z.object({
  to: z.union([z.uuid(), teamSchema]),
  subject: z.string().trim().max(SUBJECT_MAX, { error: 'message.subjectTooLong' }).default(''),
  body: z
    .string()
    .trim()
    .min(1, { error: 'message.required' })
    .max(MESSAGE_MAX, { error: 'message.tooLong' }),
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const conversationFilterSchema = z.object({
  filter: z.enum(['all', 'unread']).default('all'),
  q: z.string().trim().max(100).default(''),
});
export type ConversationFilter = z.infer<typeof conversationFilterSchema>;

export type ConversationKind = 'direct' | 'support' | 'payments';

/** Who is on the other side, as the reader sees it. */
export type Counterpart =
  | {
      kind: 'person';
      userId: string;
      firstName: string;
      lastName: string;
      role: 'student' | 'staff';
    }
  | { kind: 'team'; team: Team };

export interface ConversationSummary {
  id: string;
  kind: ConversationKind;
  counterpart: Counterpart;
  /** For team inboxes: the student the thread is with */
  student: { userId: string; firstName: string; lastName: string };
  subject: string;
  lastMessage: { body: string; fromMe: boolean; createdAt: string } | null;
  unread: number;
}

export interface ConversationList {
  items: ConversationSummary[];
  unread: number;
}

export interface MessageAttachmentView {
  id: string;
  fileName: string;
  sizeBytes: number;
  scanStatus: 'scanning' | 'clean' | 'infected' | 'failed';
}

export interface MessageView {
  id: string;
  sender: { userId: string; firstName: string; lastName: string };
  fromMe: boolean;
  body: string;
  attachments: MessageAttachmentView[];
  createdAt: string;
}

export interface ConversationThread extends Omit<ConversationSummary, 'lastMessage' | 'unread'> {
  messages: MessageView[];
  /** When the other side last read the thread (read receipt) */
  readByOthersAt: string | null;
}

/** People and teams the user may start a thread with. */
export type Recipient =
  | { kind: 'person'; userId: string; firstName: string; lastName: string; context: string }
  | { kind: 'team'; team: Team };

/** Live event: a new message in one of the user's threads. */
export interface MessageEvent {
  kind: 'message';
  conversationId: string;
  messageId: string;
}
