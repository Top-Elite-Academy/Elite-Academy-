import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/student/DashboardCard';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/config/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.courses');
  return { title: t('metaTitle') };
}

/** My courses (spec §4.4). Enrollment comes from the CRM ("Convert to student"), built later. */
export default async function StudentCoursesPage() {
  const t = await getTranslations('Student.courses');
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <div className="mt-6">
        <EmptyState text={t('empty')}>
          <ButtonLink href={ROUTES.courses}>{t('browse')}</ButtonLink>
          <ButtonLink href={ROUTES.enroll} variant="secondary">
            {t('advisor')}
          </ButtonLink>
        </EmptyState>
      </div>
    </div>
  );
}
