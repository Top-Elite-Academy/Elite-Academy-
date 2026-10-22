import type { Prisma } from '@eta/db';
import type { LessonFileView, LessonVideoView, TeachLesson } from '@eta/shared';

export const LESSON_INCLUDE = {
  videos: { orderBy: { position: 'asc' } },
  files: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.LessonInclude;
export type LessonRecord = Prisma.LessonGetPayload<{ include: typeof LESSON_INCLUDE }>;

type VideoRecord = LessonRecord['videos'][number];
type FileRecord = LessonRecord['files'][number];

export const toVideoView = (video: VideoRecord): LessonVideoView => ({
  id: video.id,
  fileName: video.fileName,
  sizeBytes: Number(video.sizeBytes),
  durationSec: video.durationSec,
  status: video.status,
});

export const toFileView = (file: FileRecord): LessonFileView => ({
  id: file.id,
  kind: file.kind,
  fileName: file.fileName,
  sizeBytes: file.sizeBytes,
  scanStatus: file.scanStatus,
});

/** Ready to publish: every video ready and no file still being scanned. */
export const canPublish = (lesson: LessonRecord) =>
  lesson.videos.every((video) => video.status === 'ready') &&
  lesson.files.every((file) => file.scanStatus !== 'scanning');

export const toTeachLesson = (lesson: LessonRecord): TeachLesson => ({
  id: lesson.id,
  programId: lesson.programId,
  position: lesson.position,
  title: lesson.title,
  about: lesson.about,
  moduleId: lesson.moduleId,
  availableFromWeek: lesson.availableFromWeek,
  status: lesson.status,
  publishedAt: lesson.publishedAt?.toISOString() ?? null,
  updatedAt: lesson.updatedAt.toISOString(),
  videos: lesson.videos.map(toVideoView),
  files: lesson.files.map(toFileView),
  canPublish: canPublish(lesson),
});
