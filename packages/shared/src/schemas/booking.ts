import { z } from 'zod';
import { LOCALES } from '../locales';

/** Booking flow (spec §3.7). The browser sends only ids; prices come from the server. */

export const serviceCodeSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/, { error: 'service.invalid' });

export const slotsQuerySchema = z.object({
  mentorId: z.uuid({ error: 'mentor.invalid' }),
  service: serviceCodeSchema,
});

export const holdBookingSchema = z.object({
  service: serviceCodeSchema,
  mentorId: z.uuid({ error: 'mentor.invalid' }),
  startAt: z.iso.datetime({ error: 'slot.invalid' }),
  /** "I agree to the cancellation policy and terms" (spec §3.7: must tick to continue). */
  agreeToTerms: z.literal(true, { error: 'terms.required' }),
  locale: z.enum(LOCALES),
});
export type HoldBookingInput = z.infer<typeof holdBookingSchema>;

export const testPaymentSchema = z.object({ outcome: z.enum(['paid', 'failed']) });

export interface SlotInfo {
  /** ISO UTC */
  startAt: string;
  endAt: string;
}

export interface HoldResponse {
  bookingId: string;
  holdExpiresAt: string;
}

export interface CheckoutResponse {
  redirectUrl: string;
}

export type BookingStatus = 'held' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/** What the booker sees about their own booking (confirmation page). */
export interface BookingView {
  id: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus | null;
  failureReason: string | null;
  service: string;
  sessions: number;
  sessionMinutes: number;
  mentor: { id: string; name: string };
  startAt: string;
  endAt: string;
  amountAgorot: number;
  holdExpiresAt: string | null;
  /** Remaining credits of a multi-session package (8-session plan). */
  creditsLeft: number | null;
}
