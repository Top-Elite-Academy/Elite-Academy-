'use client';

import type { Locale, ProgramSubject } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { SelectField } from '@/components/forms/SelectField';

export interface MentorFilterValues {
  subject: ProgramSubject | '';
  language: Locale | '';
}

/** Specialty and session language (spec §3.5). Options come from the mentors on the page. */
export function MentorFilters({
  subjects,
  languages,
  value,
  onChange,
}: {
  subjects: ProgramSubject[];
  languages: Locale[];
  value: MentorFilterValues;
  onChange: (value: MentorFilterValues) => void;
}) {
  const t = useTranslations('Mentoring.mentors');
  const tSubject = useTranslations('Subjects');
  const locale = useLocale();
  const languageNames = new Intl.DisplayNames(locale, { type: 'language' });

  return (
    <div className="grid grid-cols-2 gap-3 sm:w-[28rem]">
      <SelectField
        name="specialty"
        label={t('specialty')}
        placeholder={t('allSpecialties')}
        value={value.subject}
        options={subjects.map((subject) => ({ value: subject, label: tSubject(subject) }))}
        onChange={(event) => {
          onChange({ ...value, subject: subjects.find((s) => s === event.target.value) ?? '' });
        }}
      />
      <SelectField
        name="language"
        label={t('language')}
        placeholder={t('allLanguages')}
        value={value.language}
        options={languages.map((code) => ({ value: code, label: languageNames.of(code) ?? code }))}
        onChange={(event) => {
          onChange({ ...value, language: languages.find((l) => l === event.target.value) ?? '' });
        }}
      />
    </div>
  );
}
