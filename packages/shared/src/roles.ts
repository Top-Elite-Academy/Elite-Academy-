/** Every role in the platform (spec §1). A user may hold several. */
export const ROLES = ['student', 'instructor', 'mentor', 'sales', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Staff roles must use two-step verification and get the stricter session rules (spec §9.1). */
export const STAFF_ROLES: readonly Role[] = ['instructor', 'mentor', 'sales', 'admin'];

export function isStaff(roles: readonly Role[]): boolean {
  return roles.some((role) => STAFF_ROLES.includes(role));
}
