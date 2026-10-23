import type { TeachCohort } from '@eta/shared';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/account/SignOutButtons';
import { Logo } from '@/components/brand/Logo';
import { AreaNavLink } from '@/components/layout/AreaNavLink';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/SkipLink';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  CalendarIcon,
  CheckCircleIcon,
  HomeIcon,
  PlayIcon,
  UsersIcon,
} from '@/components/ui/icons';
import { ROUTES, TEACH_NAV, type TeachNavIcon, teachCohortPath } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { useCohortFormat } from '@/lib/format/use-cohort-format';

const ICONS: Record<TeachNavIcon, typeof HomeIcon> = {
  today: HomeIcon,
  cohorts: UsersIcon,
  sessions: CalendarIcon,
  content: PlayIcon,
  grading: CheckCircleIcon,
};

/**
 * Instructor area frame (design "Instructor 1"): maroon sidebar with the
 * instructor's cohorts and their name at the bottom; on smaller screens the
 * same links sit in a row under the top bar.
 */
export function TeachShell({
  user,
  cohorts,
  children,
}: {
  user: { firstName: string; lastName: string };
  cohorts: TeachCohort[];
  children: ReactNode;
}) {
  const t = useTranslations('Teach.nav');
  const dates = useCohortFormat();
  const name = `${user.firstName} ${user.lastName}`;

  const links = (variant: 'dark' | 'sidebar') =>
    TEACH_NAV.map((item) => {
      const Icon = ICONS[item.icon];
      return (
        <li key={item.href}>
          <AreaNavLink href={item.href} variant={variant} exact={item.exact}>
            <Icon className="size-5" />
            {t(item.label as 'today')}
          </AreaNavLink>
        </li>
      );
    });

  return (
    <>
      <SkipLink />
      <div className="flex min-h-dvh">
        <aside className="on-dark sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-maroon-900 bg-dots text-white lg:flex">
          <div className="px-5 pt-5">
            <Logo onDark />
            <p className="mt-2 font-mono text-xs text-gold-300">{t('area')}</p>
          </div>
          <nav aria-label={t('label')} className="mt-6 px-3">
            <ul className="flex flex-col gap-1">{links('dark')}</ul>
          </nav>

          {cohorts.length > 0 && (
            <section aria-labelledby="teach-my-cohorts" className="mt-8 px-5">
              <h2
                id="teach-my-cohorts"
                className="font-mono text-xs tracking-wider text-white/70 uppercase"
              >
                {t('myCohorts')}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {cohorts.map((cohort) => (
                  <li key={cohort.id}>
                    <Link
                      href={teachCohortPath(cohort.id)}
                      className="block rounded-sm text-sm hover:underline"
                    >
                      <span className="block font-semibold">
                        {`${cohort.name} · ${cohort.program.title}`}
                      </span>
                      <span className="block text-xs text-gold-300">
                        {cohort.week?.total
                          ? t('weekShort', {
                              current: cohort.week.current,
                              total: cohort.week.total,
                            })
                          : t('startsShort', { date: dates.dayMonth(cohort.startDate) })}
                        {' · '}
                        {t('students', { count: cohort.confirmed })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* pb-20: clear of the floating accessibility button. */}
          <div className="mt-auto border-t border-white/15 px-5 pt-4 pb-20">
            <div className="flex items-center gap-3">
              <MentorAvatar name={name} photoPath={null} size="sm" />
              <div className="min-w-0">
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-white/75">{t('role')}</p>
              </div>
            </div>
            <Link
              href={ROUTES.home}
              className="mt-3 inline-block rounded-sm text-sm font-semibold text-gold-300 underline"
            >
              {t('publicSite')}
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 lg:justify-end lg:px-8">
              <div className="lg:hidden">
                <Logo />
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <LanguageSwitcher saveToProfile />
                <div className="hidden sm:block">
                  <SignOutButton scope="current" />
                </div>
              </div>
            </div>
            <nav aria-label={t('label')} className="border-t border-border px-4 py-2 lg:hidden">
              <div className="flex items-center gap-2">
                <ul className="flex gap-2 overflow-x-auto">{links('sidebar')}</ul>
                {/* Sign out lives here on phones (the top bar is too narrow). */}
                <div className="ms-auto sm:hidden">
                  <SignOutButton scope="current" />
                </div>
              </div>
            </nav>
          </header>
          <main
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className="flex-1 bg-cream px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
