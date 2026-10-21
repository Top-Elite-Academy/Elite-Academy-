import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { TotpSetup } from '@/components/auth/TotpSetup';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('TwoFactor');
  return { title: t('setupTitle'), robots: { index: false } };
}

export default async function TwoFactorSetupPage() {
  const t = await getTranslations('TwoFactor');
  return (
    <AuthCard title={t('setupTitle')} intro={t('setupIntro')}>
      <TotpSetup />
    </AuthCard>
  );
}
