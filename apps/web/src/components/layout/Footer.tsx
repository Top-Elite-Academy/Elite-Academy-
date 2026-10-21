import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/Logo';
import { Container } from '@/components/ui/Container';
import { FOOTER_COLUMNS } from '@/config/navigation';
import { CONTACT } from '@/config/site';
import { Link } from '@/i18n/navigation';

const LINK_CLASS = 'rounded-sm text-sm text-navy-100 hover:text-white hover:underline';

/** Public footer (spec §2): Learn, Help, Legal and Contact columns. */
export function Footer() {
  const t = useTranslations();
  const social = [
    { label: 'Footer.instagram', href: CONTACT.social.instagram },
    { label: 'Footer.linkedin', href: CONTACT.social.linkedin },
    { label: 'Footer.facebook', href: CONTACT.social.facebook },
  ];

  return (
    <footer className="on-dark mt-auto bg-navy-900 text-white">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Logo onDark />
          <p className="mt-3 text-sm italic text-gold-400" lang="la">
            {t('Brand.motto')}
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={t(column.title)}>
            <h2 className="text-sm font-bold text-gold-400">{t(column.title)}</h2>
            <ul className="mt-3 space-y-2">
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

        <div>
          <h2 className="text-sm font-bold text-gold-400">{t('Footer.contact')}</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={`mailto:${CONTACT.email}`} className={LINK_CLASS}>
                <span className="sr-only">{t('Footer.email')}: </span>
                <bdi dir="ltr">{CONTACT.email}</bdi>
              </a>
            </li>
            <li>
              <a href={`tel:${CONTACT.phoneE164}`} className={LINK_CLASS}>
                <span className="sr-only">{t('Footer.phone')}: </span>
                <bdi dir="ltr">{CONTACT.phoneDisplay}</bdi>
              </a>
            </li>
            {social.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_CLASS}
                >
                  {t(item.label)}
                  <span className="sr-only"> {t('A11y.opensInNewTab')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-navy-700">
        <Container className="py-4 text-xs text-navy-100">
          {t('Footer.copyright', { year: new Date().getFullYear() })}
        </Container>
      </div>
    </footer>
  );
}
