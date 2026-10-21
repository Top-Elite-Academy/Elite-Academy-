import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { getNonce } from '@/lib/nonce';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Login');
  return { title: t('title'), robots: { index: false } };
}

/** Not linked from the header in version 1 (spec §2), but reachable for staff and invited users. */
export default async function LoginPage() {
  const t = await getTranslations('Login');
  return (
    <AuthCard title={t('title')}>
      <LoginForm nonce={await getNonce()} />
    </AuthCard>
  );
}
