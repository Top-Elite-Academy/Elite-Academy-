import { z } from 'zod';
import type { MentorKind } from '../content';
import type { PaymentStatus } from './booking';

/** Student area (spec §4). Every answer contains only the signed-in student's own data. */

export const sessionsQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past']).default('upcoming'),
});
export type SessionsScope = z.infer<typeof sessionsQuerySchema>['scope'];

/** Minutes before the start when "Join" opens (spec §4.3). */
export const JOIN_OPENS_MINUTES = 15;

/** One mentoring or career advice session (spec §4.5). */
export interface StudentSession {
  id: string;
  kind: MentorKind;
  /** Package code, e.g. "mentoring-8" — the web app names it. */
  service: string;
  mentor: { id: string; name: string; photoPath: string | null };
  startAt: string;
  endAt: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  /** The meeting link, only from 15 minutes before the start until the end. */
  joinUrl: string | null;
  /** When "Join" opens (ISO). */
  joinOpensAt: string;
}

/** A multi-session plan, e.g. "3 of 8 meetings used" (spec §4.3 Mentoring package card). */
export interface StudentPackage {
  id: string;
  service: string;
  mentor: { id: string; name: string } | null;
  total: number;
  used: number;
  nextSessionAt: string | null;
}

/** One order (spec §4.6). Never contains card data. */
export interface StudentOrder {
  id: string;
  createdAt: string;
  service: string;
  sessions: number;
  amountAgorot: number;
  status: PaymentStatus;
  failureReason: string | null;
  /** Set while a failed payment can still be retried (the time is still held). */
  retryBookingId: string | null;
}

export interface StudentOverview {
  upcoming: StudentSession[];
  packages: StudentPackage[];
}
