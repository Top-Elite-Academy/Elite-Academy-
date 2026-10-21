import type { FaqItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { FaqList } from '@/components/ui/FaqList';
import { CourseSection } from '../CourseSection';

/** The program's own questions (spec §3.3 "Course questions"). */
export function CourseFaqSection({ faqs }: { faqs: FaqItem[] }) {
  const t = useTranslations('Course.faq');
  if (faqs.length === 0) return null;
  return (
    <CourseSection id="faq" title={t('title')}>
      <FaqList items={faqs} name="course-faq" />
    </CourseSection>
  );
}
