import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { HEADER_NAV, ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';

/**
 * Public header (spec §2). "Log in" is intentionally not shown in version 1;
 * when enabled it goes to ROUTES.login.
 */
export function Header() {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label={t('Nav.primary')} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {HEADER_NAV.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-50"
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ButtonLink href={ROUTES.courses} className="hidden sm:inline-flex">
            {t('Nav.exploreCourses')}
          </ButtonLink>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
