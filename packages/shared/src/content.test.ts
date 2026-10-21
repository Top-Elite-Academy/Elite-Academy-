import { describe, expect, it } from 'vitest';
import { localize, programsQuerySchema } from './content';

describe('localize', () => {
  it('returns the requested language', () => {
    expect(localize({ en: 'Hello', ar: 'مرحبا', he: 'שלום' }, 'he')).toBe('שלום');
  });

  it('falls back to English when a translation is missing or empty', () => {
    expect(localize({ en: 'Hello', ar: '' }, 'ar')).toBe('Hello');
  });

  it('returns an empty string for malformed values', () => {
    expect(localize(null, 'en')).toBe('');
    expect(localize('Hello', 'en')).toBe('');
  });
});

describe('programsQuerySchema', () => {
  it('defaults to English and parses the top flag', () => {
    expect(programsQuerySchema.parse({})).toEqual({ locale: 'en', top: false });
    expect(programsQuerySchema.parse({ locale: 'ar', top: 'true' })).toEqual({
      locale: 'ar',
      top: true,
    });
  });

  it('rejects unknown languages', () => {
    expect(programsQuerySchema.safeParse({ locale: 'fr' }).success).toBe(false);
  });
});
