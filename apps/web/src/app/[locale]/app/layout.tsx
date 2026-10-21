import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StudentShell } from '@/components/student/StudentShell';
import { ROUTES } from '@/config/navigation';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { robots: { index: false } };

/** Student area (spec §4): signed-in students only; everyone else is sent to sign-in or gets 404. */
export default async function StudentAreaLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(ROUTES.account, ['student']);
  return <StudentShell name={user.firstName}>{children}</StudentShell>;
}
