import { ApiException } from '../errors/api.exception';
import type { AuthUser } from './auth-context';

/**
 * Ownership rules (spec §9.2). Every endpoint that loads a record by id must
 * call one of these before returning it. Grows with each milestone
 * (instructor → own cohorts, sales → CRM records, …).
 */
export const AccessPolicy = {
  /** A user's own record, or any record for an admin. */
  canAccessUserRecord(actor: AuthUser, ownerId: string): boolean {
    return actor.id === ownerId || actor.roles.includes('admin');
  },

  /**
   * Throws 404 (not 403) when access is denied, so a caller cannot tell
   * whether another person's record exists (prevents id probing / IDOR).
   */
  assertCanAccessUserRecord(actor: AuthUser, ownerId: string): void {
    if (!AccessPolicy.canAccessUserRecord(actor, ownerId)) {
      throw ApiException.notFound();
    }
  },
};
