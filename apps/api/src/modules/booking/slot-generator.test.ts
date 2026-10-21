import { describe, expect, it } from 'vitest';
import { generateSlots } from './slot-generator';

const TZ = 'Asia/Jerusalem';
// Sunday 8 November 2026, 10:00 Jerusalem (winter time, UTC+2).
const now = new Date('2026-11-08T08:00:00Z');
const base = { now, earliest: now, days: 14, busy: [] };

describe('generateSlots', () => {
  it('cuts weekly windows into sessions, in UTC', () => {
    const slots = generateSlots({
      ...base,
      sessionMinutes: 60,
      windows: [{ weekday: 1, startTime: '18:00', endTime: '20:00', timeZone: TZ }],
    });
    expect(slots.slice(0, 2)).toEqual([
      { startAt: '2026-11-09T16:00:00.000Z', endAt: '2026-11-09T17:00:00.000Z' },
      { startAt: '2026-11-09T17:00:00.000Z', endAt: '2026-11-09T18:00:00.000Z' },
    ]);
    expect(slots).toHaveLength(4); // two Mondays within 14 days × 2 sessions
  });

  it('only offers the next 14 days', () => {
    const slots = generateSlots({
      ...base,
      sessionMinutes: 60,
      windows: [{ weekday: 0, startTime: '18:00', endTime: '19:00', timeZone: TZ }],
    });
    expect(slots.map((s) => s.startAt.slice(0, 10))).toEqual(['2026-11-08', '2026-11-15']);
  });

  it('respects session length, the earliest start and busy time', () => {
    const slots = generateSlots({
      ...base,
      days: 1,
      earliest: new Date('2026-11-08T15:00:00Z'), // 17:00 local
      sessionMinutes: 45,
      windows: [{ weekday: 0, startTime: '16:00', endTime: '19:00', timeZone: TZ }],
      busy: [
        { startAt: new Date('2026-11-08T16:00:00Z'), endAt: new Date('2026-11-08T16:30:00Z') },
      ],
    });
    // Local times: 16:00 and 16:45 start before `earliest`; 17:30 and 18:15 overlap the busy 18:00–18:30.
    expect(slots).toEqual([]);
  });
});
