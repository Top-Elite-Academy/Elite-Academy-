'use client';

import { useTranslations } from 'next-intl';
import { SelectField } from '@/components/forms/SelectField';
import { TextField } from '@/components/forms/TextField';

export interface ProgramOption {
  slug: string;
  title: string;
}

/** "Your details": program, names, phone, occupation (spec §3.6). */
export function EnrollDetailsFields({
  programs,
  defaultProgram,
  errors,
}: {
  programs: ProgramOption[];
  defaultProgram: string | undefined;
  errors: Record<string, string>;
}) {
  const t = useTranslations('Enroll');
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SelectField
        name="programSlug"
        label={t('program')}
        placeholder={t('programPlaceholder')}
        options={programs.map((program) => ({ value: program.slug, label: program.title }))}
        defaultValue={defaultProgram ?? ''}
        required
        error={errors['programSlug']}
        className="sm:col-span-2"
      />
      <TextField
        name="firstName"
        label={t('firstName')}
        autoComplete="given-name"
        maxLength={50}
        required
        error={errors['firstName']}
      />
      <TextField
        name="lastName"
        label={t('lastName')}
        autoComplete="family-name"
        maxLength={50}
        required
        error={errors['lastName']}
      />
      <TextField
        name="phone"
        type="tel"
        label={t('phone')}
        placeholder={t('phonePlaceholder')}
        autoComplete="tel"
        inputMode="tel"
        maxLength={32}
        required
        ltr
        error={errors['phone']}
      />
      <TextField
        name="occupation"
        label={t('occupation')}
        optionalText={t('optional')}
        placeholder={t('occupationPlaceholder')}
        autoComplete="organization-title"
        maxLength={100}
        error={errors['occupation']}
      />
    </div>
  );
}
