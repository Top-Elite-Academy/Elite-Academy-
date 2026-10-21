import { Injectable } from '@nestjs/common';
import type { Consent, ConsentType } from '@eta/db';
import { AccessPolicy } from '../../common/authz/access-policy';
import type { AuthUser } from '../../common/authz/auth-context';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface GrantConsentInput {
  /** Exactly one subject (enforced by a database check constraint). */
  subject: { userId: string } | { leadId: string };
  type: ConsentType;
  textVersion: string;
  /** The exact wording shown to the person, in their language. */
  text: string;
}

export type ConsentView = Pick<
  Consent,
  'id' | 'type' | 'textVersion' | 'grantedAt' | 'withdrawnAt'
>;

/**
 * Proof of consent (spec §9.10): wording, time and IP. Used by the enroll form
 * (milestone 3), marketing preferences (milestone 4) and success stories (milestone 6).
 */
@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async grant(
    input: GrantConsentInput,
    client: ClientInfo,
    actorId: string | null,
  ): Promise<Consent> {
    const consent = await this.prisma.consent.create({
      data: {
        ...input.subject,
        type: input.type,
        textVersion: input.textVersion,
        text: input.text,
        ip: client.ip,
      },
    });
    await this.audit.record({
      actorId,
      action: 'consent.granted',
      entity: 'consent',
      entityId: consent.id,
      after: { type: consent.type, textVersion: consent.textVersion },
      client,
    });
    return consent;
  }

  async listForUser(actor: AuthUser, userId: string): Promise<ConsentView[]> {
    AccessPolicy.assertCanAccessUserRecord(actor, userId);
    return this.prisma.consent.findMany({
      where: { userId },
      select: { id: true, type: true, textVersion: true, grantedAt: true, withdrawnAt: true },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
