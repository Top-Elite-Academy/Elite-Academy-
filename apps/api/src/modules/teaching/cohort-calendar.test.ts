import { describe, expect, it } from 'vitest';
import { cohortWeek, liveClasses } from './cohort-calendar';

describe('cohortWeek', () => {
  it('counts weeks from the start date', () => {
    expect(cohortWeek('2026-08-03', 24, '2026-08-03')).toEqual({ current: 1, total: 24 });
    expect(cohortWeek('2026-08-03', 24, '2026-10-21')).toEqual({ current: 12, total: 24 });
  });

  it('is null before the start and after the last week', () => {
    expect(cohortWeek('2026-11-09', 24, '2026-10-21')).toBeNull();
    expect(cohortWeek('2026-01-04', 4, '2026-03-01')).toBeNull();
    expect(cohortWeek('2026-01-04', null, '2026-03-01')).toEqual({ current: 9, total: null });
  });
});

describe('liveClasses', () => {
  const cohort = {
    startDate: '2026-10-18',
    lengthWeeks: 24,
    schedule: { days: ['sun' as const, 'wed' as const], from: '18:00', to: '21:00' },
  };

  it('lists the class days in Jerusalem time, across the daylight-saving change', () => {
    // Wed 21 Oct (UTC+3) and Sun 25 Oct (winter time, UTC+2).
    const classes = liveClasses(cohort, '2026-10-21', 5);
    expect(classes.map((c) => c.startAt.toISOString())).toEqual([
      '2026-10-21T15:00:00.000Z',
      '2026-10-25T16:00:00.000Z',
    ]);
    expect(classes[0]!.endAt.toISOString()).toBe('2026-10-21T18:00:00.000Z');
  });

  it('has no classes before the start or after the last week', () => {
    expect(liveClasses(cohort, '2026-10-11', 7)).toEqual([]);
    expect(liveClasses({ ...cohort, lengthWeeks: 1 }, '2026-10-25', 7)).toEqual([]);
  });
});
