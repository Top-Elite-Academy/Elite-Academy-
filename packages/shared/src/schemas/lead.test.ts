import { describe, expect, it } from 'vitest';
import { enrollSchema, phoneSchema } from './lead';

const valid = {
  programSlug: 'python-ai',
  firstName: 'Rana',
  lastName: 'Arafat',
  phone: '050-123-4567',
  days: ['sun', 'tue', 'sun'],
  hours: ['evening'],
  consent: true,
  locale: 'he',
};

describe('phoneSchema', () => {
  it.each([
    ['050-123-4567', '+972501234567'],
    ['+972 50 123 4567', '+972501234567'],
    ['+44 7911 123456', '+447911123456'],
  ])('normalises %s to E.164', (input, expected) => {
    expect(phoneSchema.parse(input)).toBe(expected);
  });

  it.each(['123', 'abc', ''])('rejects %s', (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});

describe('enrollSchema', () => {
  it('accepts a complete form and normalises it', () => {
    const parsed = enrollSchema.parse({ ...valid, occupation: '  ', notes: ' Hi ' });
    expect(parsed).toMatchObject({
      phone: '+972501234567',
      days: ['sun', 'tue'],
      occupation: undefined,
      notes: 'Hi',
    });
  });

  it('requires consent, a day and an hour range', () => {
    const result = enrollSchema.safeParse({ ...valid, consent: false, days: [], hours: [] });
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining(['consent.required', 'days.required', 'hours.required']),
    );
  });

  it('limits notes to 500 characters', () => {
    expect(enrollSchema.safeParse({ ...valid, notes: 'x'.repeat(501) }).success).toBe(false);
  });
});
