import { Injectable } from '@nestjs/common';
import {
  type AttentionItem,
  assignmentDueAt,
  type GradeQueueItem,
  lateDays,
  progressStatus,
} from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { summarise } from './teaching.mapper';

const LIST_SIZE = 5;

/**
 * The "Today" panels that need data across the instructor's cohorts (design
 * "Instructor 1"): who needs attention, what waits for a grade, and the
 * average attendance.
 */
@Injectable()
export class TodayInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async insights(cohorts: { id: string; name: string }[]) {
    const [attention, queue] = await Promise.all([
      this.attention(cohorts),
      this.gradeQueue(cohorts.map((cohort) => cohort.id)),
    ]);
    return { ...attention, ...queue };
  }

  private async attention(cohorts: { id: string; name: string }[]) {
    const cohortIds = cohorts.map((cohort) => cohort.id);
    const [enrollments, marks] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { cohortId: { in: cohortIds }, status: 'confirmed' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.attendance.findMany({
        where: { cohortId: { in: cohortIds } },
        select: { userId: true, cohortId: true, status: true },
      }),
    ]);
    const rates: number[] = [];
    const needsAttention: AttentionItem[] = [];
    for (const enrollment of enrollments) {
      const summary = summarise(
        marks.filter(
          (mark) => mark.userId === enrollment.userId && mark.cohortId === enrollment.cohortId,
        ),
      );
      if (summary.rate === null) continue;
      rates.push(summary.rate);
      const status = progressStatus(summary.attended, summary.marked);
      if (status === 'behind' || status === 'at_risk')
        needsAttention.push({
          userId: enrollment.user.id,
          firstName: enrollment.user.firstName,
          lastName: enrollment.user.lastName,
          cohortId: enrollment.cohortId,
          cohortName: cohorts.find((cohort) => cohort.id === enrollment.cohortId)?.name ?? '',
          status,
          rate: summary.rate,
        });
    }
    // At risk first, then the lowest attendance.
    needsAttention.sort(
      (a, b) => Number(b.status === 'at_risk') - Number(a.status === 'at_risk') || a.rate - b.rate,
    );
    return {
      averageAttendance: rates.length
        ? Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)
        : null,
      needsAttention: needsAttention.slice(0, LIST_SIZE),
    };
  }

  private async gradeQueue(cohortIds: string[]) {
    const where = { cohortId: { in: cohortIds }, status: 'submitted' as const };
    const [count, oldest] = await Promise.all([
      this.prisma.submission.count({ where }),
      this.prisma.submission.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true } },
          cohort: { select: { startDate: true } },
          assignment: { select: { title: true, dueWeek: true } },
        },
        orderBy: { submittedAt: 'asc' },
        take: LIST_SIZE,
      }),
    ]);
    const toGrade = oldest.map((item): GradeQueueItem => ({
      id: item.id,
      cohortId: item.cohortId,
      student: { firstName: item.user.firstName, lastName: item.user.lastName },
      title: item.assignment.title,
      submittedAt: item.submittedAt.toISOString(),
      lateDays: lateDays(
        assignmentDueAt(item.cohort.startDate.toISOString().slice(0, 10), item.assignment.dueWeek),
        item.submittedAt,
      ),
    }));
    return { toGradeCount: count, toGrade };
  }
}
