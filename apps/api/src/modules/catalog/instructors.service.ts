import { Injectable } from '@nestjs/common';
import { type InstructorProfile, type Locale, localize } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InstructorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active program instructors with the published program they teach (spec §3.1 "Meet your instructors"). */
  async list(locale: Locale): Promise<InstructorProfile[]> {
    const profiles = await this.prisma.mentorProfile.findMany({
      where: { kind: 'instructor', active: true },
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        role: true,
        bio: true,
        photoPath: true,
        featured: true,
        programs: {
          where: { published: true, deletedAt: null },
          orderBy: { slug: 'asc' },
          take: 1,
          select: { slug: true, title: true },
        },
      },
    });

    return profiles.map((profile) => {
      const program = profile.programs[0];
      return {
        id: profile.id,
        slug: profile.slug,
        name: localize(profile.name, locale),
        role: localize(profile.role, locale),
        bio: localize(profile.bio, locale),
        photoPath: profile.photoPath,
        featured: profile.featured,
        program: program ? { slug: program.slug, title: localize(program.title, locale) } : null,
      };
    });
  }
}
