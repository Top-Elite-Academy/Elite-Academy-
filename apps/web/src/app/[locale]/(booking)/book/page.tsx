import type { Locale } from '@eta/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { getMentors, getPackages } from '@/lib/api/content';
import { getCurrentUser } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Booking');
  return { title: t('metaTitle'), robots: { index: false } };
}

/** Booking flow, steps 1–3 (spec §3.7). Browsing needs no account; paying does. */
export default async function BookPage() {
  const locale = (await getLocale()) as Locale;
  const [packages, instructors, advisors, user] = await Promise.all([
    getPackages(locale),
    getMentors('instructor', locale),
    getMentors('career', locale),
    getCurrentUser(),
  ]);
  return (
    <BookingWizard
      packages={packages}
      mentors={[...instructors, ...advisors]}
      signedIn={user !== null}
    />
  );
}
