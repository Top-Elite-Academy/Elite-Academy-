import { zonedCalendarDay } from '@eta/shared';
import { useFormatter } from 'next-intl';
import { BOOKING_TIME_ZONE } from '@/lib/booking/slot-days';
import { useCohortFormat } from './use-cohort-format';

/** Session times in Jerusalem time, in the page language with Western digits. */
export function useBookingFormat() {
  const format = useFormatter();
  const dates = useCohortFormat();

  /** "18:00" — keep left-to-right when rendering. */
  const time = (iso: string) =>
    format.dateTime(new Date(iso), {
      timeZone: BOOKING_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      numberingSystem: 'latn',
    });
  const day = (iso: string) => zonedCalendarDay(new Date(iso), BOOKING_TIME_ZONE).isoDate;

  return {
    time,
    /** "Mon, 9 Nov" for a calendar day "2026-11-09". */
    shortDay: dates.shortDate,
    /** "Monday, 9 November" for a session start. */
    longDay: (iso: string) => dates.longDate(day(iso)),
  };
}
