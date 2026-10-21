import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import { CONSENT_TEXTS, CURRENT_CONTACT_CONSENT, type EnrollInput } from '@eta/shared';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RateLimiterService } from '../../common/redis/rate-limiter.service';
import { AuditService } from '../audit/audit.service';
import { CaptchaService } from '../auth/services/captcha.service';
import { LeadAssignmentService } from './lead-assignment.service';

const FORMS_PER_IP_PER_HOUR = 5;
const FIRST_CALL_DUE_MS = 24 * 60 * 60 * 1000;

/** Activity and task texts are codes; the CRM screens translate them. */
export const LEAD_EVENTS = {
  createdFromWebsite: 'lead.createdFromWebsiteForm',
  websiteFormAgain: 'lead.websiteFormSubmittedAgain',
  firstCallTask: 'task.firstCall',
} as const;

/**
 * "Enroll — book a call" (spec §3.6): turns the public form into a CRM lead.
 * The visitor always gets the same answer, whether the lead is new or merged.
 */
@Injectable()
export class WebsiteLeadService {
  private readonly logger = new Logger(WebsiteLeadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly limiter: RateLimiterService,
    private readonly captcha: CaptchaService,
    private readonly assignment: LeadAssignmentService,
    private readonly audit: AuditService,
  ) {}

  async submit(input: EnrollInput, client: ClientInfo): Promise<void> {
    const rate = await this.limiter.hit(`enroll:ip:${client.ip}`, FORMS_PER_IP_PER_HOUR, 3600);
    if (!rate.allowed) throw ApiException.tooManyRequests(rate.retryAfterSeconds);

    // Bots fill the hidden field: pretend success and store nothing.
    if (input.website) {
      this.logger.warn('Enroll form honeypot triggered');
      return;
    }
    if (!(await this.captcha.verify(input.captchaToken, client.ip))) {
      throw ApiException.badRequest('captcha.required', { captchaRequired: true });
    }

    const { programId, cohortId } = await this.resolveProgram(input);
    const ownerId = await this.assignment.pickOwner();
    const { leadId, merged } = await this.prisma.$transaction((tx) =>
      this.saveLead(tx, input, { programId, cohortId, ownerId }, client),
    );

    await this.audit.record({
      actorId: null,
      action: merged ? 'lead.merged' : 'lead.created',
      entity: 'lead',
      entityId: leadId,
      after: { source: 'website_form', programId, ownerId },
      client,
    });
  }

  /** The program must be published; a cohort is kept only if it is open and belongs to it. */
  private async resolveProgram(input: EnrollInput) {
    const program = await this.prisma.program.findFirst({
      where: { slug: input.programSlug, published: true, deletedAt: null },
      select: { id: true },
    });
    if (!program) throw ApiException.badRequest('program.invalid');

    const cohort = input.cohortId
      ? await this.prisma.cohort.findFirst({
          where: { id: input.cohortId, programId: program.id, status: 'open' },
          select: { id: true },
        })
      : null;
    return { programId: program.id, cohortId: cohort?.id ?? null };
  }

  private async saveLead(
    tx: Prisma.TransactionClient,
    input: EnrollInput,
    refs: { programId: string; cohortId: string | null; ownerId: string | null },
    client: ClientInfo,
  ): Promise<{ leadId: string; merged: boolean }> {
    const fields = {
      firstName: input.firstName,
      lastName: input.lastName,
      occupation: input.occupation ?? null,
      programId: refs.programId,
      cohortId: refs.cohortId,
      availability: { days: input.days, hours: input.hours },
      notes: input.notes ?? null,
    };

    const existing = await tx.lead.findUnique({ where: { phone: input.phone } });
    const lead = existing
      ? await tx.lead.update({
          where: { id: existing.id },
          // A lost lead who asks again is a new opportunity.
          data: {
            ...fields,
            deletedAt: null,
            ...(existing.stage === 'lost' ? { stage: 'new', lostReason: null } : {}),
          },
        })
      : await tx.lead.create({
          data: { ...fields, phone: input.phone, source: 'website_form', ownerId: refs.ownerId },
        });

    await tx.activity.create({
      data: {
        leadId: lead.id,
        type: 'system',
        notes: existing ? LEAD_EVENTS.websiteFormAgain : LEAD_EVENTS.createdFromWebsite,
      },
    });
    await tx.consent.create({
      data: {
        leadId: lead.id,
        type: 'contact',
        textVersion: CURRENT_CONTACT_CONSENT,
        text: CONSENT_TEXTS[CURRENT_CONTACT_CONSENT][input.locale],
        ip: client.ip,
      },
    });
    await this.ensureFirstCallTask(tx, lead.id, lead.ownerId);
    return { leadId: lead.id, merged: Boolean(existing) };
  }

  /** Spec §3.6: a first-call task due within 24 hours (only one open at a time). */
  private async ensureFirstCallTask(
    tx: Prisma.TransactionClient,
    leadId: string,
    assigneeId: string | null,
  ) {
    const open = await tx.task.findFirst({ where: { leadId, status: { not: 'done' } } });
    if (open) return;
    await tx.task.create({
      data: {
        leadId,
        assigneeId,
        title: LEAD_EVENTS.firstCallTask,
        dueAt: new Date(Date.now() + FIRST_CALL_DUE_MS),
      },
    });
  }
}
