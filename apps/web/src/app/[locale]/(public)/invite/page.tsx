import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Invite');
  return { title: t('title'), robots: { index: false }, referrer: 'no-referrer' };
}

export default async function InvitePage() {
  const t = await getTranslations('Invite');
  return (
    <AuthCard title={t('title')} intro={t('intro')}>
      <SetPasswordForm mode="invite" />
    </AuthCard>
  );
}
