import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ForgotPassword');
  return { title: t('title'), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('ForgotPassword');
  return (
    <AuthCard title={t('title')} intro={t('intro')}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
