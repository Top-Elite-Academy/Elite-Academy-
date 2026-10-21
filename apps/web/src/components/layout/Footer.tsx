import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/Logo';
import { Container } from '@/components/ui/Container';
import { FOOTER_COLUMNS } from '@/config/navigation';
import { CONTACT } from '@/config/site';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';

const LINK_CLASS = 'rounded-sm text-sm text-white/85 hover:text-white hover:underline';
const HEADING_CLASS = 'text-sm font-semibold text-white';

/** Public footer (spec §2, landing design): brand, Platform, Support, Policies, Contact. */
export function Footer() {
  const t = useTranslations();

  return (
    // pb-20: the last lines can scroll clear of the floating chat and accessibility buttons.
    <footer className="on-dark mt-auto bg-maroon-900 bg-dots pb-20 text-white">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col items-start gap-4">
          <Logo onDark size="lg" />
          <p className="font-serif text-xl italic text-gold-300" lang="la">
            {t('Brand.motto')}
          </p>
          <p className="max-w-64 text-sm text-white/85">{t('Footer.tagline')}</p>
          <LanguageSwitcher onDark />
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={t(column.title)}>
            <h2 className={HEADING_CLASS}>{t(column.title)}</h2>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <FooterContact />
      </Container>

      <div className="border-t border-white/15">
        <Container className="py-5 text-sm text-white/85">
          {t('Footer.copyright', { year: new Date().getFullYear() })}
        </Container>
      </div>
    </footer>
  );
}

function FooterContact() {
  const t = useTranslations();
  const social = [
    { label: 'Footer.instagram', href: CONTACT.social.instagram },
    { label: 'Footer.linkedin', href: CONTACT.social.linkedin },
    { label: 'Footer.facebook', href: CONTACT.social.facebook },
  ];
  return (
    <div>
      <h2 className={HEADING_CLASS}>{t('Footer.contact')}</h2>
      <ul className="mt-4 space-y-3">
        <li>
          <a href={`mailto:${CONTACT.email}`} className={LINK_CLASS}>
            <span className="sr-only">{`${t('Footer.email')}: `}</span>
            <bdi dir="ltr">{CONTACT.email}</bdi>
          </a>
        </li>
        <li>
          <a href={`tel:${CONTACT.phoneE164}`} className={LINK_CLASS}>
            <span className="sr-only">{`${t('Footer.phone')}: `}</span>
            <bdi dir="ltr">{CONTACT.phoneDisplay}</bdi>
          </a>
        </li>
        <li className="flex flex-wrap gap-x-4 gap-y-3">
          {social.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              {t(item.label)}
              <span className="sr-only">{` ${t('A11y.opensInNewTab')}`}</span>
            </a>
          ))}
        </li>
      </ul>
    </div>
  );
}
