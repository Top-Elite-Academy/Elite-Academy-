import { describe, expect, it } from 'vitest';
import { liveClassTimes, timeOffTimes, withBreak } from './busy-times';
import { generateSlots } from './slot-generator';

const at = (iso: string) => new Date(iso);

describe('busy times', () => {
  it('keeps the break free around a booked session', () => {
    const [busy] = withBreak(
      [{ startAt: at('2026-11-02T10:00:00Z'), endAt: at('2026-11-02T11:00:00Z') }],
      15,
    );
    expect(busy).toEqual({
      startAt: at('2026-11-02T09:45:00Z'),
      endAt: at('2026-11-02T11:15:00Z'),
    });
  });

  it('blocks whole Jerusalem days off (winter: UTC+2)', () => {
    expect(timeOffTimes([{ startDate: '2026-12-29', endDate: '2026-12-31' }])).toEqual([
      { startAt: at('2026-12-28T22:00:00Z'), endAt: at('2026-12-31T22:00:00Z') },
    ]);
  });

  it('blocks the live classes of the mentor’s cohorts', () => {
    const classes = liveClassTimes(
      [
        {
          startDate: '2026-11-01',
          lengthWeeks: 24,
          schedule: { days: ['sun'], from: '18:00', to: '21:00' },
        },
      ],
      '2026-11-01',
      7,
      0,
    );
    expect(classes).toEqual([
      { startAt: at('2026-11-01T16:00:00Z'), endAt: at('2026-11-01T19:00:00Z') },
    ]);
  });

  it('a session next to a booking is not offered when there is a break', () => {
    const windows = [
      { weekday: 1, startTime: '10:00', endTime: '13:00', timeZone: 'Asia/Jerusalem' },
    ];
    const booked = [{ startAt: at('2026-11-02T08:00:00Z'), endAt: at('2026-11-02T09:00:00Z') }]; // 10:00–11:00
    const slots = (breakMinutes: number) =>
      generateSlots({
        windows,
        sessionMinutes: 60,
        now: at('2026-11-01T08:00:00Z'),
        days: 2,
        earliest: at('2026-11-01T08:00:00Z'),
        busy: withBreak(booked, breakMinutes),
      }).map((slot) => slot.startAt);
    expect(slots(0)).toEqual(['2026-11-02T09:00:00.000Z', '2026-11-02T10:00:00.000Z']);
    expect(slots(15)).toEqual(['2026-11-02T10:00:00.000Z']);
  });
});
