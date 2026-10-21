import { Injectable } from '@nestjs/common';
import type { MentorProfile, Package } from '@eta/db';
import { ApiException } from '../../common/errors/api.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';

/**
 * Turns the ids the browser sends (service code, mentor id) into trusted records.
 * The package and its price always come from the database (spec §3.7, §9.5).
 */
@Injectable()
export class BookingCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async resolve(
    serviceCode: string,
    mentorId: string,
  ): Promise<{ pkg: Package; mentor: MentorProfile }> {
    const pkg = await this.prisma.package.findFirst({ where: { code: serviceCode, active: true } });
    if (!pkg) throw ApiException.badRequest('service.invalid');

    const mentor = await this.prisma.mentorProfile.findFirst({
      where: {
        id: mentorId,
        active: true,
        // Mentoring is with instructors, career advice with career advisors.
        kind: pkg.kind,
        ...(this.config.showExampleContent ? {} : { isExample: false }),
      },
    });
    if (!mentor) throw ApiException.badRequest('mentor.invalid');
    return { pkg, mentor };
  }
}
