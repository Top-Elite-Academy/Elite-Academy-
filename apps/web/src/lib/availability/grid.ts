import {
  type AvailabilityWindow,
  GRID_FIRST_HOUR,
  GRID_LAST_HOUR,
  zonedCalendarDay,
} from '@eta/shared';
import { BOOKING_TIME_ZONE } from '@/lib/booking/slot-days';

/** Rows of the weekly grid: 07:00 … 21:00 (each row is one hour). */
export const GRID_HOURS = Array.from(
  { length: GRID_LAST_HOUR - GRID_FIRST_HOUR },
  (_, index) => GRID_FIRST_HOUR + index,
);

export const cellKey = (weekday: number, hour: number) => `${weekday}-${hour}`;
const hourOf = (time: string) => Number(time.slice(0, 2));
const minutesOf = (time: string) => Number(time.slice(3, 5));
const asTime = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** Every hour inside the windows, as grid cells. */
export function windowsToCells(windows: AvailabilityWindow[]): Set<string> {
  const cells = new Set<string>();
  for (const window of windows) {
    for (let hour = hourOf(window.startTime); hour < hourOf(window.endTime); hour++) {
      cells.add(cellKey(window.weekday, hour));
    }
  }
  return cells;
}

/** Open cells back to windows: neighbouring hours on a day become one window. */
export function cellsToWindows(cells: Set<string>): AvailabilityWindow[] {
  const windows: AvailabilityWindow[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    let start: number | null = null;
    for (let hour = GRID_FIRST_HOUR; hour <= GRID_LAST_HOUR; hour++) {
      const open = hour < GRID_LAST_HOUR && cells.has(cellKey(weekday, hour));
      if (open && start === null) start = hour;
      if (!open && start !== null) {
        windows.push({ weekday, startTime: asTime(start), endTime: asTime(hour) });
        start = null;
      }
    }
  }
  return windows;
}

/** Hours touched by a live class (a class 18:30–20:00 locks 18:00 and 19:00). */
export function classCells(
  classes: { weekday: number; startTime: string; endTime: string }[],
): Set<string> {
  const cells = new Set<string>();
  for (const lesson of classes) {
    const lastHour = hourOf(lesson.endTime) - (minutesOf(lesson.endTime) === 0 ? 1 : 0);
    for (let hour = hourOf(lesson.startTime); hour <= lastHour; hour++) {
      cells.add(cellKey(lesson.weekday, hour));
    }
  }
  return cells;
}

/** Booked sessions in the coming week, by the grid cell where they start (Jerusalem time). */
export function bookedCells(
  booked: { startAt: string; studentFirstName: string }[],
): Map<string, string> {
  const cells = new Map<string, string>();
  for (const session of booked) {
    const date = new Date(session.startAt);
    const { weekday } = zonedCalendarDay(date, BOOKING_TIME_ZONE);
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: BOOKING_TIME_ZONE,
      }).format(date),
    );
    cells.set(cellKey(weekday, hour), session.studentFirstName);
  }
  return cells;
}
