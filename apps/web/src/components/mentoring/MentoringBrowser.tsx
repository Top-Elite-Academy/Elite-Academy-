'use client';

import type { Locale, MentorCard, MentorKind, PackageInfo, ProgramSubject } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/config/navigation';
import { useMoney } from '@/lib/format/use-money';
import { MentorCardView } from './MentorCardView';
import { MentorFilters, type MentorFilterValues } from './MentorFilters';
import { PackagePicker } from './PackagePicker';

const NO_FILTERS: MentorFilterValues = { subject: '', language: '' };

/** Unique values in first-seen order. */
const unique = <T,>(values: T[]) => [...new Set(values)];

/**
 * Packages (mentoring only), filters and mentor cards for the selected service.
 * The chosen package is carried into each "Book a session" link.
 */
export function MentoringBrowser({
  kind,
  packages,
  mentors,
}: {
  kind: MentorKind;
  packages: PackageInfo[];
  mentors: MentorCard[];
}) {
  const t = useTranslations('Mentoring.mentors');
  const money = useMoney();
  const ownPackages = packages.filter((pkg) => pkg.kind === kind);
  const [service, setService] = useState(
    (ownPackages.find((pkg) => pkg.recommended) ?? ownPackages[0])?.code ?? kind,
  );
  const [filters, setFilters] = useState(NO_FILTERS);

  const subjects = useMemo(
    () => unique<ProgramSubject>(mentors.flatMap((m) => (m.subject ? [m.subject] : []))),
    [mentors],
  );
  const languages = useMemo(() => unique<Locale>(mentors.flatMap((m) => m.languages)), [mentors]);
  const visible = mentors.filter(
    (mentor) =>
      (!filters.subject || mentor.subject === filters.subject) &&
      (!filters.language || mentor.languages.includes(filters.language)),
  );
  const singleSession = ownPackages.find((pkg) => pkg.sessions === 1);
  const sessionMinutes = mentors[0]?.sessionMinutes ?? 60;

  return (
    <div className="space-y-10">
      {kind === 'instructor' && ownPackages.length > 0 && (
        <PackagePicker
          packages={ownPackages}
          sessionMinutes={sessionMinutes}
          selected={service}
          onSelect={setService}
        />
      )}

      <section aria-labelledby="mentors-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="mentors-title" className="text-xl font-semibold text-ink">
            {t(kind === 'career' ? 'titleCareer' : 'titleInstructor')}
          </h2>
          {mentors.length > 0 && (
            <MentorFilters
              subjects={subjects}
              languages={languages}
              value={filters}
              onChange={setFilters}
            />
          )}
        </div>

        {mentors.length === 0 ? (
          <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-ink/25 bg-white p-8 text-center">
            <p className="mx-auto max-w-xl text-ink">{t('careerSoon')}</p>
            <ButtonLink href={ROUTES.contact} variant="secondary" className="mt-5">
              {t('careerSoonCta')}
            </ButtonLink>
          </div>
        ) : (
          <>
            <p aria-live="polite" className="sr-only">
              {t('count', { count: visible.length })}
            </p>
            {visible.length === 0 ? (
              <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-ink/25 bg-white p-8 text-center">
                <p className="text-ink">{t('empty')}</p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                  }}
                >
                  {t('clear')}
                </Button>
              </div>
            ) : (
              <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((mentor) => (
                  <li key={mentor.id} className="flex">
                    <MentorCardView
                      mentor={mentor}
                      service={service}
                      priceLabel={singleSession ? money(singleSession.priceAgorot) : null}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
