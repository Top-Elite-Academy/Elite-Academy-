import { type SlotInfo, zonedCalendarDay } from '@eta/shared';

/** Mentors' availability is set in Jerusalem time, and times are shown in it (spec §3.7). */
export const BOOKING_TIME_ZONE = 'Asia/Jerusalem';

export interface SlotDay {
  /** Calendar day in Jerusalem, "2026-11-09". */
  isoDate: string;
  slots: SlotInfo[];
}

/** Groups free slots (already sorted by time) by their Jerusalem calendar day. */
export function groupSlotsByDay(slots: SlotInfo[]): SlotDay[] {
  const days: SlotDay[] = [];
  for (const slot of slots) {
    const { isoDate } = zonedCalendarDay(new Date(slot.startAt), BOOKING_TIME_ZONE);
    const last = days.at(-1);
    if (last?.isoDate === isoDate) last.slots.push(slot);
    else days.push({ isoDate, slots: [slot] });
  }
  return days;
}
