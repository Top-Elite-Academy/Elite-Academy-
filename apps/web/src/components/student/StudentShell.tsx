import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SignOutButton } from '@/components/account/SignOutButtons';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/SkipLink';
import {
  BookIcon,
  CalendarIcon,
  CardIcon,
  HomeIcon,
  MessageIcon,
  UserIcon,
} from '@/components/ui/icons';
import { ROUTES, STUDENT_SIDEBAR, STUDENT_TABS, type StudentNavIcon } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { StudentNavLink } from './StudentNavLink';

const ICONS: Record<StudentNavIcon, typeof HomeIcon> = {
  home: HomeIcon,
  courses: BookIcon,
  sessions: CalendarIcon,
  payments: CardIcon,
  profile: UserIcon,
  messages: MessageIcon,
};

/**
 * Student area frame (spec §4.2): sidebar on large screens (right side in RTL),
 * top bar with language and sign-out, bottom tab bar on phones (spec §4.10).
 */
export function StudentShell({ name, children }: { name: string; children: ReactNode }) {
  const t = useTranslations('Student');

  return (
    <>
      <SkipLink />
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border bg-white lg:flex">
          <div className="px-5 py-4">
            <Logo />
          </div>
          <nav aria-label={t('nav.label')} className="px-3">
            <ul className="flex flex-col gap-1">
              {STUDENT_SIDEBAR.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <StudentNavLink href={item.href} variant="sidebar">
                      <Icon className="size-5" />
                      {t(`nav.${item.label}` as 'nav.overview')}
                    </StudentNavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link
            href={ROUTES.home}
            className="mx-5 mt-8 self-start rounded-sm text-sm font-semibold text-crimson-700 underline"
          >
            {t('nav.backToSite')}
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur lg:justify-end lg:px-8">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink-muted md:inline">
                {t('account.signedInAs', { name })}
              </span>
              <LanguageSwitcher saveToProfile />
              <SignOutButton scope="current" />
            </div>
          </header>
          <main
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className="flex-1 px-4 py-6 pb-28 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      <nav
        aria-label={t('nav.label')}
        data-bottom-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {STUDENT_TABS.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.label}>
                <StudentNavLink href={item.href} variant="tab">
                  <Icon className="size-5" />
                  {t(`nav.${item.label}` as 'nav.home')}
                </StudentNavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
