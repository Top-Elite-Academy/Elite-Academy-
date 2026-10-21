import 'server-only';
import type {
  FaqItem,
  InstructorProfile,
  Locale,
  MentorCard,
  MentorKind,
  PackageInfo,
  ProgramDetails,
  ProgramSummary,
  StoryItem,
} from '@eta/shared';
import { API_INTERNAL_URL } from './internal-url';

/** Public content changes rarely; cache it for a minute between requests. */
const REVALIDATE_SECONDS = 60;

/**
 * Reads a public content list. If the API is unreachable the page still
 * renders: the section is simply left out (and the error is logged).
 */
async function getList<T>(path: string, locale: Locale): Promise<T[]> {
  const url = new URL(`/api/${path}`, API_INTERNAL_URL);
  url.searchParams.set('locale', locale);
  try {
    const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T[];
  } catch (error) {
    console.error(`Could not load ${url.pathname}: ${String(error)}`);
    return [];
  }
}

/** All published programs for the catalog (filtered in the page). */
export const getPrograms = (locale: Locale) => getList<ProgramSummary>('programs', locale);
export const getTopPrograms = (locale: Locale) =>
  getList<ProgramSummary>('programs?top=true', locale);
export const getInstructors = (locale: Locale) => getList<InstructorProfile>('instructors', locale);
export const getPackages = (locale: Locale) => getList<PackageInfo>('packages', locale);
export const getMentors = (kind: MentorKind, locale: Locale) =>
  getList<MentorCard>(`mentors?kind=${kind}`, locale);
export const getFaqs = (locale: Locale) => getList<FaqItem>('faqs', locale);
export const getStories = (locale: Locale) => getList<StoryItem>('stories', locale);

/**
 * One program for its course page. Null when it does not exist or is not published
 * (the page shows 404); any other failure is thrown so the error page is shown.
 */
export async function getProgramDetails(
  slug: string,
  locale: Locale,
): Promise<ProgramDetails | null> {
  const url = new URL(`/api/programs/${encodeURIComponent(slug)}`, API_INTERNAL_URL);
  url.searchParams.set('locale', locale);
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load ${url.pathname}: HTTP ${response.status}`);
  return (await response.json()) as ProgramDetails;
}
