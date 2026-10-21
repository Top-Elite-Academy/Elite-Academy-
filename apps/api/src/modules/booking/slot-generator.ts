import { addDays, type SlotInfo, zonedCalendarDay, zonedToUtc } from '@eta/shared';

/** A mentor's weekly free time, in their local time zone. */
export interface WeeklyWindow {
  weekday: number;
  startTime: string;
  endTime: string;
  timeZone: string;
}

export interface Interval {
  startAt: Date;
  endAt: Date;
}

const minutesOf = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
const timeOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const weekdayOf = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`).getUTCDay();

/**
 * Bookable sessions for the next `days` days (spec §3.7: next 14 days, only real
 * free time). Each window is cut into sessions of `sessionMinutes`; sessions
 * that start before `earliest` or overlap a `busy` interval are left out.
 */
export function generateSlots(options: {
  windows: WeeklyWindow[];
  sessionMinutes: number;
  now: Date;
  days: number;
  earliest: Date;
  busy: Interval[];
}): SlotInfo[] {
  const { windows, sessionMinutes, now, days, earliest, busy } = options;
  const isFree = (slot: Interval) =>
    slot.startAt >= earliest && !busy.some((b) => b.startAt < slot.endAt && b.endAt > slot.startAt);

  return windows
    .flatMap((window) => {
      const today = zonedCalendarDay(now, window.timeZone).isoDate;
      return Array.from({ length: days }, (_, offset) => addDays(today, offset))
        .filter((isoDate) => weekdayOf(isoDate) === window.weekday)
        .flatMap((isoDate) => sessionsInWindow(window, isoDate, sessionMinutes));
    })
    .filter(isFree)
    .map((slot) => ({ startAt: slot.startAt.toISOString(), endAt: slot.endAt.toISOString() }))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** One day of a weekly window cut into back-to-back sessions. */
function sessionsInWindow(
  window: WeeklyWindow,
  isoDate: string,
  sessionMinutes: number,
): Interval[] {
  const sessions: Interval[] = [];
  const last = minutesOf(window.endTime) - sessionMinutes;
  for (let start = minutesOf(window.startTime); start <= last; start += sessionMinutes) {
    const startAt = zonedToUtc(isoDate, timeOf(start), window.timeZone);
    sessions.push({ startAt, endAt: new Date(startAt.getTime() + sessionMinutes * 60_000) });
  }
  return sessions;
}
