import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ResetPassword');
  return { title: t('title'), robots: { index: false }, referrer: 'no-referrer' };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations('ResetPassword');
  return (
    <AuthCard title={t('title')}>
      <SetPasswordForm mode="reset" />
    </AuthCard>
  );
}
