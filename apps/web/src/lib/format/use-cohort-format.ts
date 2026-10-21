import type { CohortSchedule } from '@eta/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

const asDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
/** Western digits in every language; dates are calendar days (no time zone shift). */
const BASE = { timeZone: 'UTC', numberingSystem: 'latn' } as const;

/** Formats cohort dates and meeting schedules in the page language. */
export function useCohortFormat() {
  const format = useFormatter();
  const locale = useLocale();
  const tDay = useTranslations('DaysShort');

  return {
    /** "Monday, 9 November" */
    longDate: (iso: string) =>
      format.dateTime(asDate(iso), { ...BASE, weekday: 'long', day: 'numeric', month: 'long' }),
    /** "9 November" */
    dayMonth: (iso: string) =>
      format.dateTime(asDate(iso), { ...BASE, day: 'numeric', month: 'long' }),
    /** "Mon, 9 Nov" */
    shortDate: (iso: string) =>
      format.dateTime(asDate(iso), { ...BASE, weekday: 'short', day: 'numeric', month: 'short' }),
    /** "November" */
    month: (iso: string) => format.dateTime(asDate(iso), { ...BASE, month: 'long' }),
    /** "Mon & Wed" */
    days: (schedule: CohortSchedule) =>
      new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' }).format(
        schedule.days.map((day) => tDay(day)),
      ),
    /** "18:00–21:00" — keep left-to-right when rendering. */
    time: (schedule: CohortSchedule) => `${schedule.from}–${schedule.to}`,
  };
}
