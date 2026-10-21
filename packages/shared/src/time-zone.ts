/**
 * Time-zone arithmetic with the built-in Intl API (no library). Times are stored
 * in UTC and shown in the user's time zone (spec §7); mentor availability is
 * written in local time (e.g. "18:00" Jerusalem), including daylight saving.
 */

const partsFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

/** Minutes the zone is ahead of UTC at that instant (Jerusalem: 120 in winter, 180 in summer). */
export function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Local date ("2026-11-09") and time ("18:00") in `timeZone` → the UTC instant. */
export function zonedToUtc(isoDate: string, time: string, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = timeZoneOffsetMinutes(new Date(guess), timeZone);
  const candidate = guess - firstOffset * 60_000;
  // Around a daylight-saving change the offset of the result can differ: correct once.
  const secondOffset = timeZoneOffsetMinutes(new Date(candidate), timeZone);
  return new Date(guess - secondOffset * 60_000);
}

/** Calendar date (YYYY-MM-DD) and weekday (0 = Sunday) of an instant in a time zone. */
export function zonedCalendarDay(
  date: Date,
  timeZone: string,
): { isoDate: string; weekday: number } {
  const p = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { isoDate: `${p.year}-${pad(p.month)}-${pad(p.day)}`, weekday: p.weekday };
}

/** "2026-11-09" + n days, as a calendar date (no time zone involved). */
export function addDays(isoDate: string, days: number): string {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** True when the string is a real IANA time zone, e.g. "Asia/Jerusalem". */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
