import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/auth/require-user';

/** Placeholder until the admin area (milestone 6). Only admins see it; others get a 404. */
export default async function AdminHomePage() {
  await requireUser('/admin', ['admin']);
  const t = await getTranslations('Account');

  return (
    <section className="max-w-2xl rounded-[var(--radius-card)] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{t('adminTitle')}</h1>
      <p className="mt-2 text-ink-muted">{t('adminIntro')}</p>
    </section>
  );
}
