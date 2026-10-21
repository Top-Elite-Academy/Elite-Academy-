'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES, syllabusPath } from '@/config/navigation';

/** Spec §3.6 success state. Focus moves here so screen readers announce it. */
export function EnrollThankYou({
  firstName,
  programSlug,
}: {
  firstName: string;
  programSlug: string;
}) {
  const t = useTranslations('Enroll.thanks');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div role="status" className="py-6 text-center">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-semibold text-ink focus:outline-none"
      >
        {t('title', { firstName })}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-ink-muted">{t('body')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href={syllabusPath(programSlug)}>{t('syllabus')}</ButtonLink>
        <ButtonLink href={ROUTES.courses} variant="secondary">
          {t('courses')}
        </ButtonLink>
      </div>
    </div>
  );
}
