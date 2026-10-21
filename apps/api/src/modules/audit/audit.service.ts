import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import type { ClientInfo } from '../../common/http/client-info';
import { PrismaService } from '../../common/prisma/prisma.service';
import { redactSecrets } from './redact';

export interface AuditEntry {
  /** Who did it; null for anonymous events such as a failed sign-in. */
  actorId: string | null;
  /** Dotted verb, e.g. "auth.login.succeeded", "user.invited". */
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  client?: ClientInfo;
}

/** Writes the append-only audit log (spec §9.8). Secrets are stripped before storage. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        before: toJson(entry.before),
        after: toJson(entry.after),
        ip: entry.client?.ip ?? null,
        userAgent: entry.client?.userAgent ?? null,
      },
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (redactSecrets(value) as Prisma.InputJsonValue);
}
