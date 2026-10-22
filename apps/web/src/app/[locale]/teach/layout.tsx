import type { TeachCohort } from '@eta/shared';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TeachShell } from '@/components/teach/TeachShell';
import { TEACH_ROUTES } from '@/config/navigation';
import { getAsUser } from '@/lib/api/server';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { robots: { index: false } };

/** Instructor area: instructors (own cohorts) and admin (all). Others get 404. */
export default async function TeachLayout({ children }: { children: ReactNode }) {
  const user = await requireUser(TEACH_ROUTES.today, ['instructor', 'mentor', 'admin']);
  const cohorts = await getAsUser<TeachCohort[]>('/api/teach/cohorts');
  return (
    <TeachShell user={user} cohorts={cohorts}>
      {children}
    </TeachShell>
  );
}
