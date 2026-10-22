import { z } from 'zod';
import type { MentorKind } from '../content';

/** Sessions & availability (design "Instructor 5") and changing a booked session. */

/** Students may reschedule or cancel until this many hours before the start (spec §4.5). */
export const CHANGE_DEADLINE_HOURS = 24;

export const BREAK_CHOICES = [0, 10, 15, 30] as const;
export const NOTICE_CHOICES = [3, 12, 24, 48] as const;
/** The availability grid: whole hours from 07:00 to 22:00 (Jerusalem time). */
export const GRID_FIRST_HOUR = 7;
export const GRID_LAST_HOUR = 22;
export const SESSION_NOTES_MAX = 2000;

const hour = z
  .string()
  .regex(/^\d{2}:00$/, { error: 'availability.invalid' })
  .refine(
    (value) => {
      const h = Number(value.slice(0, 2));
      return h >= GRID_FIRST_HOUR && h <= GRID_LAST_HOUR;
    },
    { error: 'availability.invalid' },
  );

export const availabilityWindowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: hour,
    endTime: hour,
  })
  .refine((window) => window.startTime < window.endTime, { error: 'availability.invalid' });

export const updateAvailabilitySchema = z
  .object({
    windows: z.array(availabilityWindowSchema).max(7 * 16),
    breakMinutes: z.union(BREAK_CHOICES.map((value) => z.literal(value))),
    minNoticeHours: z.union(NOTICE_CHOICES.map((value) => z.literal(value))),
  })
  .refine((input) => !hasOverlap(input.windows), {
    error: 'availability.overlap',
    path: ['windows'],
  });
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type AvailabilityWindow = z.infer<typeof availabilityWindowSchema>;

function hasOverlap(windows: AvailabilityWindow[]): boolean {
  const sorted = [...windows].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );
  return sorted.some((window, index) => {
    const previous = sorted[index - 1];
    return previous?.weekday === window.weekday && previous.endTime > window.startTime;
  });
}

const isoDate = z.iso.date({ error: 'date.invalid' });

export const timeOffSchema = z
  .object({ startDate: isoDate, endDate: isoDate })
  .refine((range) => range.endDate >= range.startDate, {
    error: 'timeOff.range',
    path: ['endDate'],
  });
export type TimeOffInput = z.infer<typeof timeOffSchema>;

export const sessionOutcomeSchema = z
  .object({
    outcome: z.enum(['held', 'no_show']),
    notes: z.string().trim().max(SESSION_NOTES_MAX, { error: 'notes.tooLong' }).default(''),
  })
  .refine((input) => input.outcome === 'no_show' || input.notes.length > 0, {
    error: 'notes.required',
    path: ['notes'],
  });
export type SessionOutcomeInput = z.infer<typeof sessionOutcomeSchema>;

/** A new start for a session; the server checks it is one of the free times. */
export const sessionTimeSchema = z.object({
  startAt: z.iso.datetime({ error: 'slot.invalid' }),
});

/** The mentor's weekly availability page. */
export interface MentorAvailability {
  windows: AvailabilityWindow[];
  breakMinutes: number;
  minNoticeHours: number;
  /** Set by the package (e.g. 60 for mentoring, 45 for career advice). */
  sessionMinutes: number;
  timeOff: { id: string; startDate: string; endDate: string }[];
  /** Weekly live-class hours of the mentor's cohorts: closed for bookings. */
  liveClasses: { weekday: number; startTime: string; endTime: string }[];
  /** Booked sessions in the next 7 days, shown in the grid. */
  booked: { startAt: string; endAt: string; studentFirstName: string }[];
}

/** One session from the mentor's side. */
export interface MentorSession {
  id: string;
  kind: MentorKind;
  service: string;
  student: { firstName: string; lastName: string };
  startAt: string;
  endAt: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  /** "5 of 8" for a plan session */
  planPosition: { number: number; total: number } | null;
  joinUrl: string | null;
  notes: string | null;
}

export interface MentorSessions {
  /** Next 7 days */
  upcoming: MentorSession[];
  /** Past sessions still waiting for the mentor's notes */
  needsNotes: MentorSession[];
}
