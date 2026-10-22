import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { StudentShell } from '@/components/student/StudentShell';
import { ROUTES } from '@/config/navigation';
import { redirect } from '@/i18n/navigation';
import { homeFor } from '@/lib/auth/home-for';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { robots: { index: false } };

/**
 * Student area (spec §4). Signed-out visitors go to sign-in; staff who arrive
 * here (e.g. right after signing in) are sent to their own area.
 */
export default async function StudentAreaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(ROUTES.account);
  if (!user.roles.includes('student')) {
    return redirect({ href: homeFor(user.roles), locale: await getLocale() });
  }
  return <StudentShell name={user.firstName}>{children}</StudentShell>;
}
