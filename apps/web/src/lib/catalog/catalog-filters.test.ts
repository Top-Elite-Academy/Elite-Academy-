import type { ProgramSummary } from '@eta/shared';
import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  applyCatalogFilters,
  EMPTY_FILTERS,
  paramsToRecord,
  parseCatalogFilters,
  toQueryString,
} from './catalog-filters';

const program = (overrides: Partial<ProgramSummary>): ProgramSummary => ({
  slug: 'x',
  title: 'X',
  summary: '',
  level: 'beginner',
  subject: 'web',
  tags: [],
  lengthWeeks: null,
  nextCohortStart: null,
  instructorName: null,
  ...overrides,
});

const programs = [
  program({ slug: 'devops', title: 'DevOps', subject: 'devops', level: 'intermediate' }),
  program({
    slug: 'data',
    title: 'Data Analysis',
    subject: 'data',
    nextCohortStart: '2030-11-02',
    tags: ['SQL'],
  }),
  program({
    slug: 'fullstack',
    title: 'Full Stack',
    subject: 'web',
    level: 'advanced',
    nextCohortStart: '2030-11-09',
    instructorName: 'Dania Hih',
  }),
  program({ slug: 'diploma', title: 'Diploma', subject: 'web' }),
];

const slugs = (list: ProgramSummary[]) => list.map((p) => p.slug);

describe('parseCatalogFilters', () => {
  it('reads repeated params and ignores unknown values', () => {
    const filters = parseCatalogFilters({
      subject: ['data', 'hacking', 'web'],
      level: 'beginner',
      q: '  sql ',
      sort: 'price',
    });
    expect(filters).toEqual({
      subjects: ['web', 'data'],
      levels: ['beginner'],
      query: 'sql',
      sort: 'soonest',
    });
  });

  it('caps the search length', () => {
    expect(parseCatalogFilters({ q: 'a'.repeat(500) }).query).toHaveLength(100);
  });

  it('round-trips through the URL', () => {
    const filters = {
      subjects: ['data' as const],
      levels: ['beginner' as const],
      query: 'sql',
      sort: 'name' as const,
    };
    const query = toQueryString(filters);
    expect(query).toBe('subject=data&level=beginner&q=sql&sort=name');
    expect(parseCatalogFilters(paramsToRecord(new URLSearchParams(query)))).toEqual(filters);
  });

  it('leaves defaults out of the URL', () => {
    expect(toQueryString(EMPTY_FILTERS)).toBe('');
  });
});

describe('applyCatalogFilters', () => {
  it('sorts by soonest start, programs without dates last, then by name', () => {
    expect(slugs(applyCatalogFilters(programs, EMPTY_FILTERS, 'en'))).toEqual([
      'data',
      'fullstack',
      'devops',
      'diploma',
    ]);
  });

  it('sorts by name', () => {
    const sorted = applyCatalogFilters(programs, { ...EMPTY_FILTERS, sort: 'name' }, 'en');
    expect(slugs(sorted)).toEqual(['data', 'devops', 'diploma', 'fullstack']);
  });

  it('combines subject (any of) and level (any of)', () => {
    const filters = { ...EMPTY_FILTERS, subjects: ['web' as const], levels: ['advanced' as const] };
    expect(slugs(applyCatalogFilters(programs, filters, 'en'))).toEqual(['fullstack']);
  });

  it('searches title, tags and instructor, ignoring case', () => {
    expect(slugs(applyCatalogFilters(programs, { ...EMPTY_FILTERS, query: 'sql' }, 'en'))).toEqual([
      'data',
    ]);
    expect(
      slugs(applyCatalogFilters(programs, { ...EMPTY_FILTERS, query: 'DANIA' }, 'en')),
    ).toEqual(['fullstack']);
  });

  it('counts active filters', () => {
    expect(
      activeFilterCount({
        subjects: ['web'],
        levels: ['beginner', 'advanced'],
        query: 'x',
        sort: 'name',
      }),
    ).toBe(4);
  });
});
