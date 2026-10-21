import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/SkipLink';
import { Container } from '@/components/ui/Container';
import { LockIcon } from '@/components/ui/icons';
import { ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Frame of the booking pages: a calm header without the site menu, so nothing
 * distracts from finishing the booking (design "Booking flow"). No footer.
 */
export function BookingShell({ children }: { children: ReactNode }) {
  const t = useTranslations('Booking');
  return (
    <>
      <SkipLink />
      <header className="border-b border-border bg-white">
        <Container className="flex h-[4.5rem] items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 text-sm text-ink-muted md:inline-flex">
              <LockIcon className="size-4" />
              {t('secure')}
            </span>
            <LanguageSwitcher />
            <Link
              href={ROUTES.mentoring}
              className="rounded-sm text-sm font-semibold text-crimson-700 underline underline-offset-4"
            >
              {t('cancel')}
            </Link>
          </div>
        </Container>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </>
  );
}
