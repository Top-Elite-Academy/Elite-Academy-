import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignOutButton } from '@/components/account/SignOutButtons';
import { DashboardCard } from '@/components/student/DashboardCard';
import { ROUTES } from '@/config/navigation';
import { requireUser } from '@/lib/auth/require-user';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.profile');
  return { title: t('metaTitle') };
}

/** Profile and settings (spec §4.7), first part: details, language, sign out everywhere. */
export default async function StudentProfilePage() {
  const [user, t] = await Promise.all([
    requireUser(ROUTES.account, ['student']),
    getTranslations('Student.profile'),
  ]);
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardCard title={t('details')}>
          <dl className="grid gap-3">
            <div>
              <dt className="text-sm text-ink-muted">{t('name')}</dt>
              <dd className="font-semibold text-ink">{`${user.firstName} ${user.lastName}`}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{t('email')}</dt>
              <dd className="font-semibold text-ink" dir="ltr">
                {user.email}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-ink-muted">{t('changeNote')}</p>
        </DashboardCard>
        <DashboardCard title={t('language')}>
          <p className="text-ink-muted">{t('languageNote')}</p>
        </DashboardCard>
        <DashboardCard title={t('security')} className="lg:col-span-2">
          <p className="text-ink-muted">{t('signOutAllNote')}</p>
          <div className="mt-4">
            <SignOutButton scope="all" />
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
