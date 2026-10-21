import type { MentorCard, PackageInfo } from '@eta/shared';
import { describe, expect, it } from 'vitest';
import { bookingQuery, parseBookingChoice, resolveService, serviceOptions } from './booking-state';
import { groupSlotsByDay } from './slot-days';

const pkg = (code: string, kind: 'instructor' | 'career', recommended = false): PackageInfo => ({
  code,
  kind,
  sessions: code === 'mentoring-8' ? 8 : 1,
  priceAgorot: 25_000,
  sessionMinutes: 60,
  recommended,
});
const PACKAGES = [
  pkg('mentoring-1', 'instructor'),
  pkg('mentoring-8', 'instructor', true),
  pkg('career-cv', 'career'),
  pkg('career-interview', 'career'),
];
const RANA = { id: 'rana', kind: 'instructor' } as MentorCard;
const NOA = { id: 'noa', kind: 'career' } as MentorCard;

describe('resolveService', () => {
  it('keeps a known package, maps old kind links and falls back to the recommended plan', () => {
    expect(resolveService(PACKAGES, 'mentoring-1')).toBe('mentoring-1');
    expect(resolveService(PACKAGES, 'career')).toBe('career-cv');
    expect(resolveService(PACKAGES, 'free-money')).toBe('mentoring-8');
    expect(resolveService(PACKAGES, null)).toBe('mentoring-8');
  });
});

describe('parseBookingChoice', () => {
  const parse = (query: Record<string, string>) => parseBookingChoice(query, PACKAGES, [RANA, NOA]);

  it('reads a full choice from the URL', () => {
    expect(
      parse({ service: 'mentoring-8', mentor: 'rana', at: '2030-01-01T10:00:00Z', step: 'review' }),
    ).toEqual({
      service: 'mentoring-8',
      mentorId: 'rana',
      startAt: '2030-01-01T10:00:00Z',
      step: 'review',
    });
  });

  it('drops a mentor of the wrong kind and never skips a missing choice', () => {
    expect(parse({ service: 'career-cv', mentor: 'rana', step: 'review' })).toMatchObject({
      mentorId: null,
      step: 'service',
    });
    expect(parse({ service: 'mentoring-8', mentor: 'rana', step: 'review' }).step).toBe('datetime');
    expect(parse({ service: 'mentoring-8', mentor: 'rana', at: 'nonsense' }).startAt).toBeNull();
  });

  it('round-trips through the query string', () => {
    const choice = parse({ service: 'career-cv', mentor: 'noa', step: 'datetime' });
    expect(bookingQuery(choice)).toBe('service=career-cv&mentor=noa&step=datetime');
  });
});

describe('serviceOptions', () => {
  it('lists career services and the recommended plan, plus a chosen other package', () => {
    expect(serviceOptions(PACKAGES, 'mentoring-8').map((p) => p.code)).toEqual([
      'career-cv',
      'career-interview',
      'mentoring-8',
    ]);
    expect(serviceOptions(PACKAGES, 'mentoring-1').map((p) => p.code)).toContain('mentoring-1');
  });
});

describe('groupSlotsByDay', () => {
  it('groups by the Jerusalem calendar day, not the UTC one', () => {
    const slot = (startAt: string) => ({ startAt, endAt: startAt });
    // 22:30 UTC on 9 Nov is 00:30 on 10 Nov in Jerusalem (UTC+2 in winter).
    const days = groupSlotsByDay([
      slot('2026-11-09T08:00:00Z'),
      slot('2026-11-09T22:30:00Z'),
      slot('2026-11-10T08:00:00Z'),
    ]);
    expect(days.map((day) => [day.isoDate, day.slots.length])).toEqual([
      ['2026-11-09', 1],
      ['2026-11-10', 2],
    ]);
  });
});
