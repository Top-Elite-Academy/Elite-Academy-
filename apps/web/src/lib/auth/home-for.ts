import type { Role } from '@eta/shared';
import { ADMIN_ROUTES, ROUTES, TEACH_ROUTES } from '@/config/navigation';

/** Where each kind of user starts after signing in. */
export function homeFor(roles: Role[]): string {
  if (roles.includes('admin')) return ADMIN_ROUTES.home;
  if (roles.includes('instructor') || roles.includes('mentor')) return TEACH_ROUTES.today;
  if (roles.includes('sales')) return ADMIN_ROUTES.enrollments;
  return ROUTES.account;
}
