import { useTranslations } from 'next-intl';
import { CONTACT } from '@/config/site';

/** "Prefer to talk now?" with phone and WhatsApp (contact details are placeholders, spec §12). */
export function TalkNowBox() {
  const t = useTranslations();
  return (
    <section aria-labelledby="talk-now-title" className="rounded-[var(--radius-card)] bg-sand p-5">
      <h2 id="talk-now-title" className="text-sm font-semibold text-ink">
        {t('Enroll.talkNow.title')}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">{t('Enroll.talkNow.body')}</p>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
        <a href={`tel:${CONTACT.phoneE164}`} className="rounded-sm text-crimson-700 underline">
          <bdi dir="ltr">{CONTACT.phoneDisplay}</bdi>
        </a>
        <a
          href={CONTACT.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm text-crimson-700 underline"
        >
          {t('Enroll.talkNow.whatsapp')}
          <span className="sr-only">{` ${t('A11y.opensInNewTab')}`}</span>
        </a>
      </p>
    </section>
  );
}
