import type { SessionsScope, StudentSession } from '@eta/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/student/DashboardCard';
import { SessionItem } from '@/components/student/SessionItem';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES, STUDENT_ROUTES } from '@/config/navigation';
import { CONTACT } from '@/config/site';
import { Link } from '@/i18n/navigation';
import { getAsUser } from '@/lib/api/server';
import { cn } from '@/lib/cn';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.sessions');
  return { title: t('metaTitle') };
}

const SCOPES: SessionsScope[] = ['upcoming', 'past'];
const tabHref = (scope: SessionsScope) =>
  scope === 'past' ? `${STUDENT_ROUTES.sessions}?tab=past` : STUDENT_ROUTES.sessions;

/** Sessions (spec §4.5): upcoming and past mentoring and career advice sessions. */
export default async function StudentSessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const scope: SessionsScope = (await searchParams)['tab'] === 'past' ? 'past' : 'upcoming';
  const [sessions, t] = await Promise.all([
    getAsUser<StudentSession[]>(`/api/me/sessions?scope=${scope}`),
    getTranslations('Student'),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('sessions.title')}</h1>
      <nav aria-label={t('sessions.tabsLabel')} className="mt-6 border-b border-border">
        <ul className="flex gap-6">
          {SCOPES.map((item) => (
            <li key={item}>
              <Link
                href={tabHref(item)}
                aria-current={item === scope ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-block border-b-2 py-3 font-semibold',
                  item === scope
                    ? 'border-crimson-700 text-crimson-700'
                    : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {t(`sessions.tabs.${item}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {sessions.length === 0 ? (
          <EmptyState text={t(scope === 'past' ? 'sessions.emptyPast' : 'sessions.emptyUpcoming')}>
            {scope === 'upcoming' && (
              <ButtonLink href={ROUTES.mentoring}>{t('overview.bookSession')}</ButtonLink>
            )}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <li key={session.id}>
                <SessionItem session={session} upcoming={scope === 'upcoming'} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {scope === 'upcoming' && (
        <p className="mt-6 text-sm text-ink-muted">
          {t('sessions.policy')}{' '}
          <a
            href={CONTACT.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-crimson-700 underline"
          >
            {t('sessions.contact')}
          </a>
        </p>
      )}
    </div>
  );
}
