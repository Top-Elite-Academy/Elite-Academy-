import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { TotpCodeForm } from '@/components/auth/TotpCodeForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TwoFactor');
  return { title: t('verifyTitle'), robots: { index: false } };
}

export default async function TwoFactorVerifyPage() {
  const t = await getTranslations('TwoFactor');
  return (
    <AuthCard title={t('verifyTitle')} intro={t('verifyIntro')}>
      <TotpCodeForm endpoint="/api/auth/2fa/verify" />
    </AuthCard>
  );
}
