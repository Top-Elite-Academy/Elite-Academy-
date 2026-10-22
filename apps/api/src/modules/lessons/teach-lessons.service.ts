import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import {
  type CreateLessonInput,
  localize,
  type TeachLesson,
  type TeachLessonList,
  type TeachProgram,
  type UpdateLessonInput,
} from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { canPublish, LESSON_INCLUDE, type LessonRecord, toTeachLesson } from './lessons.mapper';

/**
 * Course content for instructors (design "Instructor 6"). Lessons belong to a
 * program and are shared by all its cohorts. An instructor edits only the
 * programs they teach; admin edits all.
 */
@Injectable()
export class TeachLessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private programScope(user: AuthUser): Prisma.ProgramWhereInput {
    return user.roles.includes('admin') ? {} : { instructor: { userId: user.id } };
  }

  async programs(user: AuthUser): Promise<TeachProgram[]> {
    const programs = await this.prisma.program.findMany({
      where: { ...this.programScope(user), deletedAt: null },
      include: { _count: { select: { lessons: true } } },
      orderBy: { slug: 'asc' },
    });
    return programs.map((program) => ({
      id: program.id,
      slug: program.slug,
      title: localize(program.title, user.locale),
      lessonCount: program._count.lessons,
    }));
  }

  private async program(user: AuthUser, programId: string) {
    const program = await this.prisma.program.findFirst({
      where: { id: programId, deletedAt: null, ...this.programScope(user) },
    });
    if (!program) throw ApiException.notFound();
    return program;
  }

  /** A lesson of one of the instructor's programs, or 404. */
  async lessonRecord(user: AuthUser, lessonId: string): Promise<LessonRecord> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, program: this.programScope(user) },
      include: LESSON_INCLUDE,
    });
    if (!lesson) throw ApiException.notFound();
    return lesson;
  }

  async list(user: AuthUser, programId: string): Promise<TeachLessonList> {
    const program = await this.program(user, programId);
    const [modules, lessons] = await Promise.all([
      this.prisma.programModule.findMany({ where: { programId }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.lesson.findMany({
        where: { programId },
        include: LESSON_INCLUDE,
        orderBy: { position: 'asc' },
      }),
    ]);
    return {
      program: { id: program.id, slug: program.slug, title: localize(program.title, user.locale) },
      modules: modules.map((module) => ({
        id: module.id,
        title: localize(module.title, user.locale),
        weekFrom: module.weekFrom,
        weekTo: module.weekTo,
      })),
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        position: lesson.position,
        title: lesson.title,
        status: lesson.status,
        moduleId: lesson.moduleId,
        processing:
          lesson.videos.some(
            (video) => video.status === 'uploading' || video.status === 'processing',
          ) || lesson.files.some((file) => file.scanStatus === 'scanning'),
      })),
    };
  }

  /** "Add lesson": a draft at the end of the program. */
  async create(
    user: AuthUser,
    programId: string,
    input: CreateLessonInput,
    client: ClientInfo,
  ): Promise<TeachLesson> {
    await this.program(user, programId);
    await this.assertModule(programId, input.moduleId);
    const last = await this.prisma.lesson.aggregate({
      where: { programId },
      _max: { position: true },
    });
    const lesson = await this.prisma.lesson.create({
      data: {
        programId,
        moduleId: input.moduleId,
        title: input.title,
        position: (last._max.position ?? 0) + 1,
        createdById: user.id,
      },
      include: LESSON_INCLUDE,
    });
    await this.record(user, 'lesson.created', lesson.id, { title: input.title }, client);
    return toTeachLesson(lesson);
  }

  async get(user: AuthUser, lessonId: string): Promise<TeachLesson> {
    return toTeachLesson(await this.lessonRecord(user, lessonId));
  }

  async update(
    user: AuthUser,
    lessonId: string,
    input: UpdateLessonInput,
    client: ClientInfo,
  ): Promise<TeachLesson> {
    const lesson = await this.lessonRecord(user, lessonId);
    if (input.moduleId !== undefined) await this.assertModule(lesson.programId, input.moduleId);
    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: input,
      include: LESSON_INCLUDE,
    });
    await this.record(user, 'lesson.updated', lesson.id, input, client);
    return toTeachLesson(updated);
  }

  /** Students see it once published (and once their cohort reaches the week). */
  async publish(user: AuthUser, lessonId: string, client: ClientInfo): Promise<TeachLesson> {
    const lesson = await this.lessonRecord(user, lessonId);
    if (!canPublish(lesson)) throw ApiException.conflict('lesson.notReady');
    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { status: 'published', publishedAt: lesson.publishedAt ?? new Date() },
      include: LESSON_INCLUDE,
    });
    await this.record(user, 'lesson.published', lesson.id, {}, client);
    return toTeachLesson(updated);
  }

  async unpublish(user: AuthUser, lessonId: string, client: ClientInfo): Promise<TeachLesson> {
    const lesson = await this.lessonRecord(user, lessonId);
    const updated = await this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { status: 'draft' },
      include: LESSON_INCLUDE,
    });
    await this.record(user, 'lesson.unpublished', lesson.id, {}, client);
    return toTeachLesson(updated);
  }

  /** Only drafts can be deleted; videos and files are removed by the caller first. */
  async assertDeletable(user: AuthUser, lessonId: string): Promise<LessonRecord> {
    const lesson = await this.lessonRecord(user, lessonId);
    if (lesson.status === 'published') throw ApiException.conflict('lesson.published');
    return lesson;
  }

  async delete(user: AuthUser, lesson: LessonRecord, client: ClientInfo): Promise<void> {
    await this.prisma.lesson.delete({ where: { id: lesson.id } });
    await this.record(user, 'lesson.deleted', lesson.id, { title: lesson.title }, client);
  }

  private async assertModule(programId: string, moduleId: string | null | undefined) {
    if (!moduleId) return;
    const found = await this.prisma.programModule.count({ where: { id: moduleId, programId } });
    if (found === 0) throw ApiException.badRequest('lesson.moduleInvalid');
  }

  private record(
    user: AuthUser,
    action: string,
    lessonId: string,
    after: unknown,
    client: ClientInfo,
  ) {
    return this.audit.record({
      actorId: user.id,
      action,
      entity: 'lesson',
      entityId: lessonId,
      after,
      client,
    });
  }
}
