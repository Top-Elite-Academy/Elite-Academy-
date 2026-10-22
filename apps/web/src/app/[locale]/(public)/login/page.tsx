import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { homeFor } from '@/lib/auth/home-for';
import { getNonce } from '@/lib/nonce';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Login');
  return { title: t('title'), robots: { index: false } };
}

/** Sign-in, linked from the header. Someone already signed in goes straight to their area. */
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) return redirect({ href: homeFor(user.roles), locale: await getLocale() });
  const t = await getTranslations('Login');
  return (
    <AuthCard title={t('title')}>
      <LoginForm nonce={await getNonce()} />
    </AuthCard>
  );
}
