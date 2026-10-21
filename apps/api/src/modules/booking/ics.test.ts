import { describe, expect, it } from 'vitest';
import { buildIcs } from './ics';

describe('buildIcs', () => {
  it('builds a valid event in UTC with escaped text', () => {
    const ics = buildIcs({
      uid: 'abc',
      startAt: new Date('2026-11-09T16:00:00Z'),
      endAt: new Date('2026-11-09T17:00:00Z'),
      title: 'Mentoring, with Dania; Hih',
      description: 'Line one\nLine two',
      now: new Date('2026-10-21T10:00:00Z'),
    });
    expect(ics).toContain('DTSTART:20261109T160000Z');
    expect(ics).toContain('DTEND:20261109T170000Z');
    expect(ics).toContain('SUMMARY:Mentoring\\, with Dania\\; Hih');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
