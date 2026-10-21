import {
  type Locale,
  PROGRAM_LEVELS,
  PROGRAM_SUBJECTS,
  type ProgramLevel,
  type ProgramSubject,
  type ProgramSummary,
} from '@eta/shared';

/**
 * Catalog filters (spec §3.2). Kept in the URL — `?subject=data&level=beginner&q=sql&sort=name`
 * — so a filtered list can be shared. Pure functions: used on the server (first render)
 * and in the browser (instant updates).
 */
export const CATALOG_SORTS = ['soonest', 'name'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface CatalogFilters {
  subjects: ProgramSubject[];
  levels: ProgramLevel[];
  query: string;
  sort: CatalogSort;
}

export const EMPTY_FILTERS: CatalogFilters = {
  subjects: [],
  levels: [],
  query: '',
  sort: 'soonest',
};

const MAX_QUERY_LENGTH = 100;

type RawParams = Record<string, string | string[] | undefined>;

const listOf = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Keeps only known values, in their canonical order; anything else in the URL is ignored. */
function pick<T extends string>(allowed: readonly T[], values: string[]): T[] {
  return allowed.filter((option) => values.includes(option));
}

export function parseCatalogFilters(params: RawParams): CatalogFilters {
  const sort = listOf(params['sort'])[0];
  return {
    subjects: pick(PROGRAM_SUBJECTS, listOf(params['subject'])),
    levels: pick(PROGRAM_LEVELS, listOf(params['level'])),
    query: (listOf(params['q'])[0] ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    sort: CATALOG_SORTS.includes(sort as CatalogSort) ? (sort as CatalogSort) : 'soonest',
  };
}

/** Same shape for URLSearchParams (browser). */
export function paramsToRecord(params: URLSearchParams): RawParams {
  const record: Record<string, string[]> = {};
  params.forEach((value, key) => {
    (record[key] ??= []).push(value);
  });
  return record;
}

/** Query string without defaults, e.g. "subject=data&level=beginner". */
export function toQueryString(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  for (const subject of filters.subjects) params.append('subject', subject);
  for (const level of filters.levels) params.append('level', level);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.sort !== 'soonest') params.set('sort', filters.sort);
  return params.toString();
}

export function activeFilterCount(filters: CatalogFilters): number {
  return filters.subjects.length + filters.levels.length + (filters.query.trim() ? 1 : 0);
}

function matchesQuery(program: ProgramSummary, query: string, locale: Locale): boolean {
  const needle = query.trim().toLocaleLowerCase(locale);
  if (!needle) return true;
  const haystack = [program.title, program.summary, program.instructorName ?? '', ...program.tags]
    .join(' ')
    .toLocaleLowerCase(locale);
  return haystack.includes(needle);
}

/** Soonest start first (programs without dates last), then by name. */
function compare(sort: CatalogSort, locale: Locale) {
  const byName = (a: ProgramSummary, b: ProgramSummary) => a.title.localeCompare(b.title, locale);
  if (sort === 'name') return byName;
  return (a: ProgramSummary, b: ProgramSummary) => {
    if (a.nextCohortStart === b.nextCohortStart) return byName(a, b);
    if (!a.nextCohortStart) return 1;
    if (!b.nextCohortStart) return -1;
    return a.nextCohortStart.localeCompare(b.nextCohortStart);
  };
}

export function applyCatalogFilters(
  programs: ProgramSummary[],
  filters: CatalogFilters,
  locale: Locale,
): ProgramSummary[] {
  return programs
    .filter((program) => !filters.subjects.length || filters.subjects.includes(program.subject))
    .filter((program) => !filters.levels.length || filters.levels.includes(program.level))
    .filter((program) => matchesQuery(program, filters.query, locale))
    .sort(compare(filters.sort, locale));
}
