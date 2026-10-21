import type { Locale } from '@eta/shared';
import { getLocale } from 'next-intl/server';
import { getFaqs, getPackages, getPrograms } from '@/lib/api/content';
import { ChatAssistant } from './ChatAssistant';

/**
 * Loads what the assistant may talk about (cached public content) and hands it
 * to the browser. Program prices are not part of this data (spec: never shown).
 */
export async function ChatLoader() {
  const locale = (await getLocale()) as Locale;
  const [programs, faqs, packages] = await Promise.all([
    getPrograms(locale),
    getFaqs(locale),
    getPackages(locale),
  ]);
  const mentoring = packages.filter((pkg) => pkg.kind === 'instructor');
  const single = mentoring.find((pkg) => pkg.sessions === 1);
  const plan = mentoring.find((pkg) => pkg.recommended);

  return (
    <ChatAssistant
      programs={programs}
      faqs={faqs}
      mentoringPrices={
        single && plan ? { singleAgorot: single.priceAgorot, planAgorot: plan.priceAgorot } : null
      }
    />
  );
}
