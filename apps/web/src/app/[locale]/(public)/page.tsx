import type { Locale } from '@eta/shared';
import { getLocale } from 'next-intl/server';
import { ClosingCtaSection } from '@/components/landing/ClosingCtaSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { InstructorsSection } from '@/components/landing/InstructorsSection';
import { LandingHero } from '@/components/landing/LandingHero';
import { LearningWaysSection } from '@/components/landing/LearningWaysSection';
import { StoriesSection } from '@/components/landing/StoriesSection';
import { TopProgramsSection } from '@/components/landing/TopProgramsSection';
import { getFaqs, getInstructors, getStories, getTopPrograms } from '@/lib/api/content';

/** Landing page (spec §3.1): sections in the order of the design. */
export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  const [programs, instructors, stories, faqs] = await Promise.all([
    getTopPrograms(locale),
    getInstructors(locale),
    getStories(locale),
    getFaqs(locale),
  ]);

  return (
    <>
      <LandingHero />
      <TopProgramsSection programs={programs} />
      <LearningWaysSection />
      <HowItWorksSection />
      <StoriesSection stories={stories} />
      <InstructorsSection instructors={instructors} />
      <FaqSection faqs={faqs} />
      <ClosingCtaSection />
    </>
  );
}
