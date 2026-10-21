import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { SignupForm } from '@/components/auth/SignupForm';
import { getNonce } from '@/lib/nonce';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Signup');
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Student account, needed to pay for a booking (spec §3.7). */
export default async function SignupPage() {
  const t = await getTranslations('Signup');
  return (
    <AuthCard title={t('title')} intro={t('intro')}>
      <SignupForm nonce={await getNonce()} />
    </AuthCard>
  );
}
