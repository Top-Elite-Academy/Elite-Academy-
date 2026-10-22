import { z } from 'zod';

/** Course content (design "Instructor 6") and the lesson player (spec §4.8). */

export const LESSON_TITLE_MAX = 200;
export const LESSON_ABOUT_MAX = 5000;
/** Materials and exercises (design: "max 100 MB per file"). */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
/** Lesson videos (design: "MP4 or MOV up to 20 GB"). */
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024 * 1024;

/**
 * Files students may download: documents, images, data, notebooks, code and
 * ZIPs of code (design "Allowed: PDF, images, CSV, IPYNB, ZIP of code").
 * Checked by extension on the server; every file is also virus-scanned.
 */
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  ipynb: 'application/x-ipynb+json',
  zip: 'application/zip',
  py: 'text/x-python',
  js: 'text/javascript',
  ts: 'text/plain',
  sql: 'text/plain',
};
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm'] as const;

/** "lesson-12-slides.PDF" → "pdf" */
export const extensionOf = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';

const title = z
  .string()
  .trim()
  .min(1, { error: 'lesson.titleRequired' })
  .max(LESSON_TITLE_MAX, { error: 'lesson.titleTooLong' });

export const createLessonSchema = z.object({
  title,
  // A form's "No module" choice arrives as an empty string.
  moduleId: z.union([z.uuid(), z.literal('').transform(() => null), z.null()]).default(null),
});
export type CreateLessonInput = z.infer<typeof createLessonSchema>;

/** Empty form value → null (a select's "none" choice sends ""). */
const emptyAsNull = z.literal('').transform(() => null);
const week = z.number().int().min(1).max(104);

export const updateLessonSchema = z
  .object({
    title,
    about: z.string().trim().max(LESSON_ABOUT_MAX, { error: 'lesson.aboutTooLong' }),
    moduleId: z.union([z.uuid(), emptyAsNull, z.null()]),
    availableFromWeek: z.union([
      week,
      // Forms send numbers as text.
      z.string().regex(/^\d+$/).transform(Number).pipe(week),
      emptyAsNull,
      z.null(),
    ]),
  })
  .partial();
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const createVideoSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((name) => (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(extensionOf(name)), {
      error: 'video.type',
    }),
  sizeBytes: z.number().int().positive().max(MAX_VIDEO_BYTES, { error: 'video.tooLarge' }),
});
export type CreateVideoInput = z.infer<typeof createVideoSchema>;

export const fileKindSchema = z.enum(['material', 'exercise']);
export type LessonFileKind = z.infer<typeof fileKindSchema>;

export const lessonProgressSchema = z.object({
  positionSec: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60)
    .optional(),
  completed: z.boolean().optional(),
});
export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;

export type LessonStatus = 'draft' | 'published';
export type VideoStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type ScanStatus = 'scanning' | 'clean' | 'infected' | 'failed';

/** A program the instructor teaches (course content is per program). */
export interface TeachProgram {
  id: string;
  slug: string;
  title: string;
  lessonCount: number;
}

export interface TeachModule {
  id: string;
  title: string;
  weekFrom: number;
  weekTo: number;
}

export interface TeachLessonSummary {
  id: string;
  position: number;
  title: string;
  status: LessonStatus;
  moduleId: string | null;
  /** A video is still uploading or being processed */
  processing: boolean;
}

export interface TeachLessonList {
  program: { id: string; slug: string; title: string; lengthWeeks: number | null };
  /** Where videos go: the local stand-in (2 GB) or Cloudflare Stream (20 GB, resumable). */
  videoProvider: 'local' | 'cloudflare';
  modules: TeachModule[];
  lessons: TeachLessonSummary[];
}

export interface LessonVideoView {
  id: string;
  fileName: string;
  sizeBytes: number;
  durationSec: number | null;
  status: VideoStatus;
}

export interface LessonFileView {
  id: string;
  kind: LessonFileKind;
  fileName: string;
  sizeBytes: number;
  scanStatus: ScanStatus;
}

export interface TeachLesson {
  id: string;
  programId: string;
  position: number;
  title: string;
  about: string;
  moduleId: string | null;
  availableFromWeek: number | null;
  status: LessonStatus;
  publishedAt: string | null;
  updatedAt: string;
  videos: LessonVideoView[];
  files: LessonFileView[];
  /** Every video ready and every file scanned (design: "publish when the video finishes processing") */
  canPublish: boolean;
}

export type VideoUploadTarget =
  { protocol: 'tus'; url: string } | { protocol: 'put'; url: `/api/${string}` };

export interface CreateVideoResponse {
  video: LessonVideoView;
  upload: VideoUploadTarget;
}

/** Student: the course content sidebar (spec §4.8). */
export interface CourseOutline {
  program: { slug: string; title: string };
  cohort: { id: string; name: string; week: number | null };
  /** Completed published lessons, 0–100 */
  progressPercent: number;
  modules: {
    id: string | null;
    title: string | null;
    lessons: {
      id: string;
      position: number;
      title: string;
      completed: boolean;
      /** Opens in a later week of the cohort */
      lockedUntilWeek: number | null;
    }[];
  }[];
}

export type VideoPlayback = { kind: 'file'; url: string } | { kind: 'iframe'; url: string };

/** Student: one lesson in the player (spec §4.8). */
export interface StudentLesson {
  id: string;
  position: number;
  title: string;
  about: string;
  program: { slug: string; title: string };
  videos: { id: string; durationSec: number | null; playback: VideoPlayback }[];
  files: { id: string; kind: LessonFileKind; fileName: string; sizeBytes: number }[];
  completed: boolean;
  positionSec: number;
  previousLessonId: string | null;
  nextLessonId: string | null;
}
