import { getTranslations } from 'next-intl/server';
import { SignOutButton } from '@/components/account/SignOutButtons';
import { ROUTES } from '@/config/navigation';
import { requireUser } from '@/lib/auth/require-user';

/** Placeholder until the student dashboard (milestone 4). Proves the sign-in flow end to end. */
export default async function AccountHomePage() {
  const user = await requireUser(ROUTES.account);
  const t = await getTranslations();

  return (
    <section className="max-w-2xl rounded-[var(--radius-card)] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">
        {t('Account.title', { firstName: user.firstName })}
      </h1>
      <p className="mt-2 text-ink-muted">{t('Account.intro')}</p>
      <h2 className="mt-6 text-sm font-bold text-ink">{t('Account.roles')}</h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {user.roles.map((role) => (
          <li key={role} className="rounded-full bg-sand px-3 py-1 text-sm text-ink">
            {t(`Roles.${role}`)}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <SignOutButton scope="all" />
      </div>
    </section>
  );
}
