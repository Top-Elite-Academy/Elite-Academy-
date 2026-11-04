'use client';

import type { MentorCard, PackageInfo } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { MentorAvatar } from '@/components/mentoring/MentorAvatar';
import { PackageSale } from '@/components/mentoring/PackageSale';
import { useMoney } from '@/lib/format/use-money';
import { RadioCard, RadioDot } from './RadioCard';
import { useServiceText } from './use-service-text';

/** Step 1 (spec §3.7): what to book and with whom. */
export function ServiceStep({
  options,
  service,
  mentors,
  mentorId,
  onService,
  onMentor,
}: {
  options: PackageInfo[];
  service: string;
  /** Mentors who offer the chosen service. */
  mentors: MentorCard[];
  mentorId: string | null;
  onService: (code: string) => void;
  onMentor: (id: string) => void;
}) {
  const t = useTranslations('Booking.service');
  const text = useServiceText();
  const money = useMoney();

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="sr-only">{t('legend')}</legend>
        <div className="space-y-3">
          {options.map((pkg) => {
            const checked = pkg.code === service;
            return (
              <RadioCard
                key={pkg.code}
                name="service"
                value={pkg.code}
                checked={checked}
                onSelect={onService}
                className="gap-3 p-4"
              >
                <RadioDot checked={checked} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{text.title(pkg.code)}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{text.body(pkg)}</span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-lg font-bold text-ink">{money(pkg.priceAgorot)}</span>
                  <PackageSale pkg={pkg} packages={options} />
                </span>
              </RadioCard>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold text-ink">{t('mentorLegend')}</legend>
        {mentors.length === 0 ? (
          <p className="mt-3 text-ink-muted">{t('noMentors')}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {mentors.map((mentor) => (
              <MentorOption
                key={mentor.id}
                mentor={mentor}
                checked={mentor.id === mentorId}
                onSelect={onMentor}
              />
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}

function MentorOption({
  mentor,
  checked,
  onSelect,
}: {
  mentor: MentorCard;
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  const locale = useLocale();
  const languageNames = new Intl.DisplayNames(locale, { type: 'language' });
  return (
    <RadioCard
      name="mentor"
      value={mentor.id}
      checked={checked}
      onSelect={onSelect}
      className="items-center gap-3 p-4"
    >
      <MentorAvatar name={mentor.name} photoPath={mentor.photoPath} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{mentor.name}</span>
        <span className="block text-sm text-ink-muted">{mentor.program?.title ?? mentor.role}</span>
        <span className="mt-1 block text-xs text-ink-muted">
          {mentor.languages.map((code) => languageNames.of(code)).join(' · ')}
        </span>
      </span>
      <RadioDot checked={checked} />
    </RadioCard>
  );
}
