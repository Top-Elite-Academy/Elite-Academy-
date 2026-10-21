import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CONTACT } from '@/config/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Student.messages');
  return { title: t('metaTitle') };
}

/** Messages & support (spec §4.9). In-platform messaging comes in a later step. */
export default async function StudentMessagesPage() {
  const t = await getTranslations('Student.messages');
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm">
        <p className="text-ink-muted">{t('soon')}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-ink-muted">{t('whatsapp')}</dt>
            <dd>
              <a
                href={CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="font-semibold text-crimson-700 underline"
              >
                {CONTACT.phoneDisplay}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">{t('email')}</dt>
            <dd>
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-semibold text-crimson-700 underline"
              >
                {CONTACT.email}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
