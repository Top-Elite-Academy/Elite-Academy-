import { describe, expect, it } from 'vitest';
import { upcomingClassDates } from './schedule';

const cohort = {
  startDate: '2026-10-04',
  lengthWeeks: 3,
  schedule: { days: ['sun' as const, 'wed' as const], from: '18:00', to: '21:00' },
};

describe('upcomingClassDates', () => {
  it('lists the next class days from today', () => {
    expect(upcomingClassDates(cohort, '2026-10-12', 3)).toEqual([
      '2026-10-14',
      '2026-10-18',
      '2026-10-21',
    ]);
  });

  it('starts at the first day before the cohort begins and stops after the last week', () => {
    expect(upcomingClassDates(cohort, '2026-09-01', 2)).toEqual(['2026-10-04', '2026-10-07']);
    expect(upcomingClassDates(cohort, '2026-10-22', 5)).toEqual([]);
  });
});
