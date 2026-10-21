import { type Locale, programSlugSchema } from '@eta/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';
import { CourseHero } from '@/components/course/CourseHero';
import { CourseJsonLd } from '@/components/course/CourseJsonLd';
import { type CourseSectionId, CourseSectionNav } from '@/components/course/CourseSectionNav';
import { EnrollmentPanel } from '@/components/course/EnrollmentPanel';
import { AccessSection } from '@/components/course/sections/AccessSection';
import { CourseFaqSection } from '@/components/course/sections/CourseFaqSection';
import { CurriculumSection } from '@/components/course/sections/CurriculumSection';
import { InstructorSection } from '@/components/course/sections/InstructorSection';
import { OutcomesSection } from '@/components/course/sections/OutcomesSection';
import { OverviewSection } from '@/components/course/sections/OverviewSection';
import { ScheduleSection } from '@/components/course/sections/ScheduleSection';
import { Container } from '@/components/ui/Container';
import { programPath } from '@/config/navigation';
import { getProgramDetails } from '@/lib/api/content';
import { getNonce } from '@/lib/nonce';
import { pageAlternates } from '@/lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
}

/** One request per page render, shared by the metadata and the page. */
const loadProgram = cache(async (slug: string) => {
  if (!programSlugSchema.safeParse(slug).success) return null;
  return getProgramDetails(slug, (await getLocale()) as Locale);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = await loadProgram(slug);
  if (!program) return {};
  return {
    title: program.title,
    description: program.summary,
    alternates: pageAlternates(programPath(slug), (await getLocale()) as Locale),
  };
}

/** Course details (spec §3.3) — one template for every program. */
export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const program = await loadProgram(slug);
  if (!program) notFound();
  const locale = await getLocale();

  const sections: CourseSectionId[] = [
    'overview',
    ...(program.outcomes.length ? (['outcomes'] as const) : []),
    'curriculum',
    'schedule',
    'access',
    ...(program.instructor ? (['instructor'] as const) : []),
    ...(program.faqs.length ? (['faq'] as const) : []),
  ];
  const webOrigin = process.env['WEB_ORIGIN'] ?? 'http://localhost:3000';

  return (
    <div className="pb-24 lg:pb-0">
      <CourseJsonLd
        program={program}
        url={`${webOrigin}/${locale}${programPath(slug)}`}
        nonce={await getNonce()}
      />
      <CourseHero program={program} />

      <Container className="grid gap-8 py-8 lg:grid-cols-[1fr_22rem] lg:py-10">
        {/* Phones: the card comes first; desktop: sticky on the end side, overlapping the hero. */}
        <aside className="lg:order-last lg:-mt-56">
          <div className="lg:sticky lg:top-24">
            <EnrollmentPanel
              slug={slug}
              lengthWeeks={program.lengthWeeks}
              cohorts={program.cohorts}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <CourseSectionNav sections={sections} />
          <OverviewSection program={program} />
          <OutcomesSection outcomes={program.outcomes} />
          <CurriculumSection
            slug={slug}
            modules={program.modules}
            lengthWeeks={program.lengthWeeks}
          />
          <ScheduleSection cohorts={program.cohorts} />
          <AccessSection />
          <InstructorSection instructor={program.instructor} />
          <CourseFaqSection faqs={program.faqs} />
        </div>
      </Container>
    </div>
  );
}
