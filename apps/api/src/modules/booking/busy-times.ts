import { addDays, type CohortSchedule, zonedToUtc } from '@eta/shared';
import { liveClasses, TEACHING_TIME_ZONE } from '../../common/time/cohort-calendar';
import type { Interval } from './slot-generator';

const MINUTE = 60_000;

/** Booked sessions plus the mentor's break before and after each one. */
export function withBreak(sessions: Interval[], breakMinutes: number): Interval[] {
  const pad = breakMinutes * MINUTE;
  return sessions.map((session) => ({
    startAt: new Date(session.startAt.getTime() - pad),
    endAt: new Date(session.endAt.getTime() + pad),
  }));
}

/** Live classes of the mentor's cohorts in the coming days (plus the break around them). */
export function liveClassTimes(
  cohorts: { startDate: string; lengthWeeks: number | null; schedule: CohortSchedule }[],
  fromIso: string,
  days: number,
  breakMinutes: number,
): Interval[] {
  return withBreak(
    cohorts.flatMap((cohort) => liveClasses(cohort, fromIso, days)),
    breakMinutes,
  );
}

/** Whole days off, from midnight to midnight in Jerusalem. */
export function timeOffTimes(ranges: { startDate: string; endDate: string }[]): Interval[] {
  return ranges.map((range) => ({
    startAt: zonedToUtc(range.startDate, '00:00', TEACHING_TIME_ZONE),
    endAt: zonedToUtc(addDays(range.endDate, 1), '00:00', TEACHING_TIME_ZONE),
  }));
}
