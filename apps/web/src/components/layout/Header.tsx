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
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t('Nav.primary')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {HEADER_NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="rounded-[var(--radius-control)] px-2.5 py-2 text-[0.95rem] font-medium text-ink hover:text-crimson-700"
                  >
                    {t(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {/* Wrapped: the button's own display class would override `hidden`. */}
          <div className="hidden sm:block">
            <ButtonLink href={ROUTES.courses}>{t('Nav.exploreCourses')}</ButtonLink>
          </div>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
