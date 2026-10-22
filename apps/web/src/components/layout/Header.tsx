import { getTranslations } from 'next-intl/server';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { HEADER_NAV, ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/api/server';
import { homeFor } from '@/lib/auth/home-for';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { NavLink } from './NavLink';

/**
 * Public header (spec §2). Guests see "Log in"; signed-in people see "My area",
 * which opens the student, instructor or admin area.
 */
export async function Header() {
  const [t, user] = await Promise.all([getTranslations(), getCurrentUser()]);
  const account = user
    ? { href: homeFor(user.roles), label: t('Nav.myArea') }
    : { href: ROUTES.login, label: t('Nav.login') };
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
      <Container className="flex h-[4.5rem] items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t('Nav.primary')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {HEADER_NAV.map((item) => (
                <li key={item.label}>
                  <NavLink href={item.href}>{t(item.label)}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href={account.href}
            className="hidden rounded-sm px-2 py-2 font-semibold whitespace-nowrap text-ink hover:text-crimson-700 md:inline-block"
          >
            {account.label}
          </Link>
          {/* Wrapped: the button's own display class would override `hidden`. */}
          <div className="hidden sm:block">
            <ButtonLink href={ROUTES.courses}>{t('Nav.exploreCourses')}</ButtonLink>
          </div>
          <MobileMenu account={account} />
        </div>
      </Container>
    </header>
  );
}
