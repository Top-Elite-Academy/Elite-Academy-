import { zonedCalendarDay } from '@eta/shared';
import { BOOKING_TIME_ZONE } from '@/lib/booking/slot-days';

/** Today's date and the current hour in Jerusalem (server components). */
export function jerusalemNow(now = new Date()): { isoDate: string; hour: number } {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: BOOKING_TIME_ZONE,
    }).format(now),
  );
  return { isoDate: zonedCalendarDay(now, BOOKING_TIME_ZONE).isoDate, hour };
}

/** Jerusalem calendar day of an instant. */
export const jerusalemDay = (iso: string) =>
  zonedCalendarDay(new Date(iso), BOOKING_TIME_ZONE).isoDate;

/** "Good morning / afternoon / evening". */
export const partOfDay = (hour: number) =>
  hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
