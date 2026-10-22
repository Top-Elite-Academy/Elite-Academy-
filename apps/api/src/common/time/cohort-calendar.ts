import { addDays, type CohortSchedule, zonedCalendarDay, zonedToUtc } from '@eta/shared';

/** Live classes are scheduled in Jerusalem time (spec §3.3). */
export const TEACHING_TIME_ZONE = 'Asia/Jerusalem';

const WEEKDAYS: CohortSchedule['days'] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);

/** "Week 12 of 24": null before the start or after the last week. */
export function cohortWeek(
  startDate: string,
  lengthWeeks: number | null,
  todayIso: string,
): { current: number; total: number | null } | null {
  const days = daysBetween(startDate, todayIso);
  if (days < 0) return null;
  const current = Math.floor(days / 7) + 1;
  if (lengthWeeks !== null && current > lengthWeeks) return null;
  return { current, total: lengthWeeks };
}

/**
 * The cohort's live classes on the given calendar days (Jerusalem), as UTC
 * instants. Days before the start or after the last week have no class.
 */
export function liveClasses(
  cohort: { startDate: string; lengthWeeks: number | null; schedule: CohortSchedule },
  fromIso: string,
  dayCount: number,
): { startAt: Date; endAt: Date }[] {
  const lastDay =
    cohort.lengthWeeks === null ? null : addDays(cohort.startDate, cohort.lengthWeeks * 7 - 1);
  const classes: { startAt: Date; endAt: Date }[] = [];
  for (let offset = 0; offset < dayCount; offset++) {
    const day = addDays(fromIso, offset);
    if (day < cohort.startDate || (lastDay !== null && day > lastDay)) continue;
    const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()];
    if (!weekday || !cohort.schedule.days.includes(weekday)) continue;
    classes.push({
      startAt: zonedToUtc(day, cohort.schedule.from, TEACHING_TIME_ZONE),
      endAt: zonedToUtc(day, cohort.schedule.to, TEACHING_TIME_ZONE),
    });
  }
  return classes;
}

/** Today's calendar date in Jerusalem. */
export const jerusalemToday = (now = new Date()) =>
  zonedCalendarDay(now, TEACHING_TIME_ZONE).isoDate;

/**
 * Class days that have happened (today included), newest first, at most
 * `limit`. Used for attendance: one row per live class.
 */
export function pastClassDates(
  cohort: { startDate: string; lengthWeeks: number | null; schedule: CohortSchedule },
  todayIso: string,
  limit: number,
): string[] {
  const dates: string[] = [];
  for (
    let day = todayIso;
    day >= cohort.startDate && dates.length < limit;
    day = addDays(day, -1)
  ) {
    if (liveClasses(cohort, day, 1).length > 0) dates.push(day);
  }
  return dates;
}

/** True when the cohort had (or has) a live class on that calendar day. */
export const isClassDay = (
  cohort: { startDate: string; lengthWeeks: number | null; schedule: CohortSchedule },
  isoDate: string,
) => liveClasses(cohort, isoDate, 1).length > 0;
