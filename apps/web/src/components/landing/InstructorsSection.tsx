import type { InstructorProfile } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { InstructorShowcase } from './InstructorShowcase';

/** Spec §3.1.6 — "Meet your instructors". */
export function InstructorsSection({ instructors }: { instructors: InstructorProfile[] }) {
  const t = useTranslations('Landing.instructors');
  if (instructors.length === 0) return null;

  return (
    <section aria-labelledby="instructors-title" className="bg-cream py-20">
      <Container>
        <SectionHeading id="instructors-title" title={t('title')} description={t('description')} />
        <InstructorShowcase instructors={instructors} />
      </Container>
    </section>
  );
}
