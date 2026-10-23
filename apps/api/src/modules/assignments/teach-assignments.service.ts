import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import type { AssignmentView, RubricCriterion, SaveAssignmentInput } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TeachLessonsService } from '../lessons/teach-lessons.service';
import { readRubric } from './assignments.mapper';

/** The exercise of a lesson (design "Instructor 4"/"Instructor 6"): instructions, due week, rubric. */
@Injectable()
export class TeachAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessons: TeachLessonsService,
    private readonly audit: AuditService,
  ) {}

  async get(user: AuthUser, lessonId: string): Promise<AssignmentView | null> {
    await this.lessons.lessonRecord(user, lessonId);
    const assignment = await this.prisma.assignment.findUnique({
      where: { lessonId },
      include: { _count: { select: { submissions: true } } },
    });
    return assignment && toView(assignment);
  }

  /** Creates or updates the lesson's exercise. Criteria keep their id so draft grades still match. */
  async save(
    user: AuthUser,
    lessonId: string,
    input: SaveAssignmentInput,
    client: ClientInfo,
  ): Promise<AssignmentView> {
    await this.lessons.lessonRecord(user, lessonId);
    const existing = await this.prisma.assignment.findUnique({ where: { lessonId } });
    const known = new Set(existing ? readRubric(existing.rubric).map((row) => row.id) : []);
    const rubric: RubricCriterion[] = input.rubric.map((row) => ({
      // An id the browser made up is replaced; only ids of this rubric are kept.
      id: row.id && known.has(row.id) ? row.id : randomUUID().slice(0, 8),
      title: row.title,
      maxPoints: row.maxPoints,
    }));
    const data = {
      title: input.title,
      instructions: input.instructions,
      dueWeek: input.dueWeek,
      rubric: rubric as unknown as Prisma.InputJsonArray,
    };
    const saved = await this.prisma.assignment.upsert({
      where: { lessonId },
      create: { lessonId, ...data },
      update: data,
      include: { _count: { select: { submissions: true } } },
    });
    await this.audit.record({
      actorId: user.id,
      action: existing ? 'assignment.updated' : 'assignment.created',
      entity: 'assignment',
      entityId: saved.id,
      after: { lessonId, title: input.title, dueWeek: input.dueWeek },
      client,
    });
    return toView(saved);
  }

  /** Only while nobody has handed anything in. */
  async remove(user: AuthUser, lessonId: string, client: ClientInfo): Promise<void> {
    const assignment = await this.get(user, lessonId);
    if (!assignment) throw ApiException.notFound();
    if (assignment.submissionCount > 0) throw ApiException.conflict('assignment.hasSubmissions');
    await this.prisma.assignment.delete({ where: { id: assignment.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'assignment.deleted',
      entity: 'assignment',
      entityId: assignment.id,
      after: { lessonId },
      client,
    });
  }
}

function toView(
  assignment: Prisma.AssignmentGetPayload<{
    include: { _count: { select: { submissions: true } } };
  }>,
): AssignmentView {
  return {
    id: assignment.id,
    lessonId: assignment.lessonId,
    title: assignment.title,
    instructions: assignment.instructions,
    dueWeek: assignment.dueWeek,
    rubric: readRubric(assignment.rubric),
    submissionCount: assignment._count.submissions,
  };
}
