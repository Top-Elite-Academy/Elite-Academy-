import { addDays, type CohortSchedule } from '@eta/shared';

const WEEKDAYS: CohortSchedule['days'] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** The next class days (YYYY-MM-DD) from today, within the cohort's weeks. */
export function upcomingClassDates(
  cohort: { startDate: string; lengthWeeks: number | null; schedule: CohortSchedule },
  todayIso: string,
  count: number,
): string[] {
  const lastDay =
    cohort.lengthWeeks === null ? null : addDays(cohort.startDate, cohort.lengthWeeks * 7 - 1);
  const dates: string[] = [];
  let day = todayIso > cohort.startDate ? todayIso : cohort.startDate;
  // A year is more than any program; the limit only guards against bad data.
  for (let step = 0; dates.length < count && step < 366; step++, day = addDays(day, 1)) {
    if (lastDay !== null && day > lastDay) break;
    const weekday = WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()];
    if (weekday && cohort.schedule.days.includes(weekday)) dates.push(day);
  }
  return dates;
}
