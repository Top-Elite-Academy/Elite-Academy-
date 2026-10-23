import { Injectable } from '@nestjs/common';
import {
  type CourseOutline,
  type LessonProgressInput,
  localize,
  type StudentLesson,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import { FileStorage } from '../../common/files/file-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { cohortWeek, jerusalemToday } from '../../common/time/cohort-calendar';
import { VideoProvider } from './video/video-provider';

/** Download links work for a few minutes only. */
const DOWNLOAD_SECONDS = 5 * 60;

/**
 * Lessons for students (spec §4.8). Only confirmed students of a cohort of the
 * program see them, only once published, and only from the lesson's week.
 */
@Injectable()
export class StudentLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: VideoProvider,
    private readonly storage: FileStorage,
  ) {}

  /** The student's furthest week in a confirmed cohort of the program; 404 if not enrolled. */
  async access(user: AuthUser, programId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: user.id, status: 'confirmed', cohort: { programId } },
      include: { cohort: { include: { program: { select: { lengthWeeks: true } } } } },
    });
    const [first] = enrollments;
    if (!first) throw ApiException.notFound();
    const today = jerusalemToday();
    const weeks = enrollments.map(
      ({ cohort }) =>
        cohortWeek(cohort.startDate.toISOString().slice(0, 10), cohort.program.lengthWeeks, today)
          ?.current ??
        // After the last week everything stays open; before the start, nothing week-bound is.
        (cohort.startDate.toISOString().slice(0, 10) < today ? Number.MAX_SAFE_INTEGER : 0),
    );
    return { cohort: first.cohort, week: Math.max(...weeks) };
  }

  private lockedUntil(availableFromWeek: number | null, week: number): number | null {
    return availableFromWeek !== null && week < availableFromWeek ? availableFromWeek : null;
  }

  async outline(user: AuthUser, programSlug: string): Promise<CourseOutline> {
    const program = await this.prisma.program.findFirst({
      where: { slug: programSlug, deletedAt: null },
    });
    if (!program) throw ApiException.notFound();
    const { cohort, week } = await this.access(user, program.id);

    const [modules, lessons, done] = await Promise.all([
      this.prisma.programModule.findMany({
        where: { programId: program.id },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.lesson.findMany({
        where: { programId: program.id, status: 'published' },
        orderBy: { position: 'asc' },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId: user.id, completedAt: { not: null }, lesson: { programId: program.id } },
        select: { lessonId: true },
      }),
    ]);
    const completed = new Set(done.map((row) => row.lessonId));
    const toItem = (lesson: (typeof lessons)[number]) => ({
      id: lesson.id,
      position: lesson.position,
      title: lesson.title,
      completed: completed.has(lesson.id),
      lockedUntilWeek: this.lockedUntil(lesson.availableFromWeek, week),
    });

    const groups = modules
      .map((module) => ({
        id: module.id,
        title: localize(module.title, user.locale),
        lessons: lessons.filter((lesson) => lesson.moduleId === module.id).map(toItem),
      }))
      .filter((group) => group.lessons.length > 0);
    const loose = lessons.filter((lesson) => !lesson.moduleId).map(toItem);
    const finished = lessons.filter((lesson) => completed.has(lesson.id)).length;

    return {
      program: { slug: program.slug, title: localize(program.title, user.locale) },
      cohort: {
        id: cohort.id,
        name: cohort.name,
        week: week === Number.MAX_SAFE_INTEGER || week === 0 ? null : week,
      },
      progressPercent: lessons.length ? Math.round((finished / lessons.length) * 100) : 0,
      modules: [...groups, ...(loose.length ? [{ id: null, title: null, lessons: loose }] : [])],
    };
  }

  /** A published, open lesson of the student's program, or 404 (never reveals drafts). */
  async openLesson(user: AuthUser, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, status: 'published' },
      include: {
        program: true,
        videos: { where: { status: 'ready' }, orderBy: { position: 'asc' } },
        files: { where: { scanStatus: 'clean' }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!lesson) throw ApiException.notFound();
    const { week } = await this.access(user, lesson.programId);
    if (this.lockedUntil(lesson.availableFromWeek, week) !== null) throw ApiException.notFound();
    return lesson;
  }

  async lesson(user: AuthUser, lessonId: string): Promise<StudentLesson> {
    const lesson = await this.openLesson(user, lessonId);
    const [progress, siblings, videos] = await Promise.all([
      this.prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      }),
      this.prisma.lesson.findMany({
        where: { programId: lesson.programId, status: 'published' },
        orderBy: { position: 'asc' },
        select: { id: true },
      }),
      Promise.all(
        lesson.videos.map(async (video) => ({
          id: video.id,
          durationSec: video.durationSec,
          playback: await this.provider.playback(video.providerVideoId),
        })),
      ),
    ]);
    const index = siblings.findIndex((sibling) => sibling.id === lesson.id);
    return {
      id: lesson.id,
      position: lesson.position,
      title: lesson.title,
      about: lesson.about,
      program: { slug: lesson.program.slug, title: localize(lesson.program.title, user.locale) },
      videos,
      files: lesson.files.map((file) => ({
        id: file.id,
        kind: file.kind,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes,
      })),
      completed: Boolean(progress?.completedAt),
      positionSec: progress?.positionSec ?? 0,
      previousLessonId: siblings[index - 1]?.id ?? null,
      nextLessonId: siblings[index + 1]?.id ?? null,
    };
  }

  /** A short-lived link that downloads a clean file with its own name. */
  async downloadUrl(user: AuthUser, lessonId: string, fileId: string): Promise<string> {
    const lesson = await this.openLesson(user, lessonId);
    const file = lesson.files.find((item) => item.id === fileId);
    if (!file) throw ApiException.notFound();
    return this.storage.signedUrl(file.storageKey, {
      expiresInSeconds: DOWNLOAD_SECONDS,
      download: file.fileName,
    });
  }

  async saveProgress(user: AuthUser, lessonId: string, input: LessonProgressInput): Promise<void> {
    const lesson = await this.openLesson(user, lessonId);
    const completedAt =
      input.completed === undefined ? undefined : input.completed ? new Date() : null;
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        positionSec: input.positionSec ?? 0,
        completedAt: completedAt ?? null,
      },
      update: {
        ...(input.positionSec === undefined ? {} : { positionSec: input.positionSec }),
        ...(completedAt === undefined ? {} : { completedAt }),
      },
    });
  }
}
