import type { Prisma } from '@eta/db';
import type { ConversationSummary, Counterpart, MessageView, Team } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { isStudentSide } from './messaging-access';

const PERSON = { select: { id: true, firstName: true, lastName: true } } as const;

export const CONVERSATION_INCLUDE = {
  student: PERSON,
  staff: PERSON,
} satisfies Prisma.ConversationInclude;

export const MESSAGE_INCLUDE = {
  sender: PERSON,
  attachments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MessageInclude;

export type ConversationRecord = Prisma.ConversationGetPayload<{
  include: typeof CONVERSATION_INCLUDE;
}>;
export type MessageRecord = Prisma.MessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

const person = (user: { id: string; firstName: string; lastName: string }) => ({
  userId: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
});

/** The other side as the reader sees it: the staff member or team for a student, the student for staff. */
export function counterpartFor(user: AuthUser, conversation: ConversationRecord): Counterpart {
  if (!isStudentSide(user, conversation))
    return { kind: 'person', role: 'student', ...person(conversation.student) };
  if (conversation.kind !== 'direct' || !conversation.staff)
    return { kind: 'team', team: conversation.kind as Team };
  return { kind: 'person', role: 'staff', ...person(conversation.staff) };
}

export function toSummaryBase(
  user: AuthUser,
  conversation: ConversationRecord,
): Omit<ConversationSummary, 'lastMessage' | 'unread'> {
  return {
    id: conversation.id,
    kind: conversation.kind,
    counterpart: counterpartFor(user, conversation),
    student: person(conversation.student),
    subject: conversation.subject,
  };
}

export const toMessageView = (user: AuthUser, message: MessageRecord): MessageView => ({
  id: message.id,
  sender: person(message.sender),
  fromMe: message.senderId === user.id,
  body: message.body,
  attachments: message.attachments.map((file) => ({
    id: file.id,
    fileName: file.fileName,
    sizeBytes: file.sizeBytes,
    scanStatus: file.scanStatus,
  })),
  createdAt: message.createdAt.toISOString(),
});
