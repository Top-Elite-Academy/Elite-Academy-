/** iCalendar (.ics) for "Add to calendar" (spec §3.7, §8). Plain text, no library needed. */

const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** RFC 5545 text escaping: backslash, semicolon, comma and line breaks. */
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function buildIcs(event: {
  uid: string;
  startAt: Date;
  endAt: Date;
  title: string;
  description: string;
  now?: Date;
}): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Elite Tech Academy//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@elitetech.academy`,
    `DTSTAMP:${stamp(event.now ?? new Date())}`,
    `DTSTART:${stamp(event.startAt)}`,
    `DTEND:${stamp(event.endAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
