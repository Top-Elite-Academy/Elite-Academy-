import type { ProgramDetails } from '@eta/shared';

/**
 * schema.org "Course" structured data for search engines (spec §10 SEO).
 * No price (spec §1). `<` is escaped so the JSON can never close the script tag.
 */
export function CourseJsonLd({
  program,
  url,
  nonce,
}: {
  program: ProgramDetails;
  url: string;
  nonce: string | undefined;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: program.title,
    description: program.summary,
    url,
    inLanguage: program.teachingLanguages,
    provider: { '@type': 'EducationalOrganization', name: 'Elite Tech Academy' },
    hasCourseInstance: program.cohorts.map((cohort) => ({
      '@type': 'CourseInstance',
      courseMode: 'online',
      startDate: cohort.startDate,
    })),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // eslint-disable-next-line react/no-danger -- server-built JSON with "<" escaped; no user HTML
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
