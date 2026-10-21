import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Chooses the owner of a new lead (spec §3.6). Rule for now: round-robin by
 * load — the active sales person with the fewest open leads (ties: the longest
 * serving). The final rule (round-robin / by program / manual) is an open item
 * in spec §12; only this class changes when it is decided.
 */
@Injectable()
export class LeadAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async pickOwner(): Promise<string | null> {
    const candidates = await this.prisma.user.findMany({
      where: { status: 'active', deletedAt: null, roles: { some: { role: 'sales' } } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        _count: { select: { ownedLeads: { where: { stage: { notIn: ['registered', 'lost'] } } } } },
      },
    });
    let best: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (!best || candidate._count.ownedLeads < best._count.ownedLeads) best = candidate;
    }
    return best?.id ?? null;
  }
}
