import { describe, expect, it } from 'vitest';
import { addDays, timeZoneOffsetMinutes, zonedCalendarDay, zonedToUtc } from './time-zone';

const TZ = 'Asia/Jerusalem';

describe('time zones', () => {
  it('knows Israel winter and summer time', () => {
    expect(timeZoneOffsetMinutes(new Date('2026-11-09T12:00:00Z'), TZ)).toBe(120);
    expect(timeZoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'), TZ)).toBe(180);
  });

  it('converts local Jerusalem time to UTC in both seasons', () => {
    expect(zonedToUtc('2026-11-09', '18:00', TZ).toISOString()).toBe('2026-11-09T16:00:00.000Z');
    expect(zonedToUtc('2026-07-01', '18:00', TZ).toISOString()).toBe('2026-07-01T15:00:00.000Z');
  });

  it('handles the days daylight saving changes', () => {
    // Israel moves clocks forward on the Friday before the last Sunday of March.
    expect(zonedToUtc('2027-03-26', '18:00', TZ).toISOString()).toBe('2027-03-26T15:00:00.000Z');
    expect(zonedToUtc('2026-10-25', '18:00', TZ).toISOString()).toBe('2026-10-25T16:00:00.000Z');
  });

  it('gives the local calendar day and weekday of an instant', () => {
    // 23:30 UTC on Saturday is already Sunday in Jerusalem.
    expect(zonedCalendarDay(new Date('2026-11-07T23:30:00Z'), TZ)).toEqual({
      isoDate: '2026-11-08',
      weekday: 0,
    });
  });

  it('adds calendar days across months', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});
