import { z } from 'zod';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales';

export const PROGRAM_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type ProgramLevel = (typeof PROGRAM_LEVELS)[number];

export const PROGRAM_SUBJECTS = ['web', 'data', 'ai', 'devops'] as const;
export type ProgramSubject = (typeof PROGRAM_SUBJECTS)[number];

/** Public text stored once per language. */
export type LocalizedText = Record<Locale, string>;

export const localizedTextSchema = z.object({ en: z.string(), ar: z.string(), he: z.string() });

/** Picks the requested language, falling back to English when a translation is missing. */
export function localize(value: unknown, locale: Locale): string {
  const parsed = localizedTextSchema.partial().safeParse(value);
  if (!parsed.success) return '';
  return parsed.data[locale] || parsed.data[DEFAULT_LOCALE] || '';
}

/** `?locale=` on every public content endpoint. */
export const contentQuerySchema = z.object({ locale: z.enum(LOCALES).default(DEFAULT_LOCALE) });

export const programsQuerySchema = contentQuerySchema.extend({
  top: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

// ---- Public API responses (never contain prices or internal fields) ---------

export interface ProgramSummary {
  slug: string;
  title: string;
  summary: string;
  level: ProgramLevel;
  subject: ProgramSubject;
  tags: string[];
  lengthWeeks: number | null;
  /** ISO date (YYYY-MM-DD) of the next open cohort, or null. */
  nextCohortStart: string | null;
  instructorName: string | null;
}

export interface InstructorProfile {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photoPath: string | null;
  featured: boolean;
  program: { slug: string; title: string } | null;
}

export interface FaqItem {
  key: string;
  question: string;
  answer: string;
}

export interface StoryItem {
  key: string;
  personName: string;
  programLabel: string;
  outcome: string | null;
  quote: string;
  photoPath: string | null;
}

// ---- Course details (spec §3.3) --------------------------------------------

/** Public lists stored once per language. */
export type LocalizedList = Record<Locale, string[]>;

const localizedListSchema = z.object({
  en: z.array(z.string()),
  ar: z.array(z.string()),
  he: z.array(z.string()),
});

/** Like localize(), for lists; falls back to English when the language is missing or empty. */
export function localizeList(value: unknown, locale: Locale): string[] {
  const parsed = localizedListSchema.partial().safeParse(value);
  if (!parsed.success) return [];
  const list = parsed.data[locale];
  return list?.length ? list : (parsed.data[DEFAULT_LOCALE] ?? []);
}

export const programSlugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

/** Cohort meeting days and times, e.g. {days: ["sun","wed"], from: "18:00", to: "21:00"}. */
export const cohortScheduleSchema = z.object({
  days: z.array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])).min(1),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
});
export type CohortSchedule = z.infer<typeof cohortScheduleSchema>;

export interface CohortInfo {
  id: string;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  schedule: CohortSchedule | null;
  seatsLeft: number;
  status: 'open' | 'full';
}

export interface ModuleInfo {
  order: number;
  title: string;
  weekFrom: number;
  weekTo: number;
  topics: string[];
}

export interface ProgramInstructor {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoPath: string | null;
  languages: Locale[];
}

export interface ProgramDetails extends ProgramSummary {
  overview: string;
  audience: string;
  outcomes: string[];
  teachingLanguages: Locale[];
  modules: ModuleInfo[];
  /** Upcoming cohorts that are open or full (full ones are shown disabled). */
  cohorts: CohortInfo[];
  instructor: ProgramInstructor | null;
  faqs: FaqItem[];
}
