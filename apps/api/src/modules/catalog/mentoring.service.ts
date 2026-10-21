import { Injectable } from '@nestjs/common';
import {
  type Locale,
  localize,
  localizeList,
  type MentorCard,
  type MentorKind,
  type PackageInfo,
} from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Mentoring and career advice page (spec §3.5): packages with prices, and mentor cards. */
@Injectable()
export class MentoringService {
  constructor(private readonly prisma: PrismaService) {}

  async packages(): Promise<PackageInfo[]> {
    return this.prisma.package.findMany({
      where: { active: true },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      select: { code: true, kind: true, sessions: true, priceAgorot: true, recommended: true },
    });
  }

  async mentors(kind: MentorKind, locale: Locale): Promise<MentorCard[]> {
    const mentors = await this.prisma.mentorProfile.findMany({
      where: { kind, active: true },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
      include: {
        programs: {
          where: { published: true, deletedAt: null },
          orderBy: { slug: 'asc' },
          take: 1,
          select: { slug: true, title: true, subject: true },
        },
      },
    });

    return mentors.map((mentor) => {
      const program = mentor.programs[0];
      return {
        id: mentor.id,
        name: localize(mentor.name, locale),
        role: localize(mentor.role, locale),
        kind: mentor.kind,
        subject: program?.subject ?? null,
        program: program ? { slug: program.slug, title: localize(program.title, locale) } : null,
        skills: localizeList(mentor.skills, locale),
        languages: mentor.languages,
        sessionMinutes: mentor.sessionMinutes,
        photoPath: mentor.photoPath,
      };
    });
  }
}
