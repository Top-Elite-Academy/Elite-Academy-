'use client';

import type { InstructorProfile } from '@eta/shared';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { bookMentorPath, programPath } from '@/config/navigation';
import { cn } from '@/lib/cn';

/**
 * Three round photos; hover, keyboard focus or click selects an instructor and
 * the spotlight card below shows their details (spec §3.1.6). The featured
 * instructor (Dania) is selected on load.
 */
export function InstructorShowcase({ instructors }: { instructors: InstructorProfile[] }) {
  const t = useTranslations('Landing.instructors');
  const spotlightId = useId();
  const initial = instructors.find((person) => person.featured) ?? instructors[0];
  const [selectedId, setSelectedId] = useState(initial?.id);
  const selected = instructors.find((person) => person.id === selectedId) ?? initial;
  if (!selected) return null;

  return (
    <>
      <ul className="mt-12 grid grid-cols-3 gap-3 sm:gap-10">
        {instructors.map((person) => {
          const isSelected = person.id === selected.id;
          const choose = () => {
            setSelectedId(person.id);
          };
          return (
            <li key={person.id} className="flex justify-center">
              <button
                type="button"
                aria-pressed={isSelected}
                aria-controls={spotlightId}
                onMouseEnter={choose}
                onFocus={choose}
                onClick={choose}
                className="group flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-2"
              >
                <span
                  className={cn(
                    'relative block size-24 overflow-hidden rounded-full border bg-white transition-all sm:size-40 lg:size-64',
                    isSelected ? 'border-[3px] border-crimson-700' : 'border-gold-500/40',
                  )}
                >
                  {person.photoPath && (
                    <Image
                      src={person.photoPath}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 16rem, (min-width: 640px) 10rem, 6rem"
                      className="object-cover object-top"
                    />
                  )}
                </span>
                <span className="text-center">
                  <span className="block text-sm font-semibold text-ink sm:text-base">
                    {person.name}
                  </span>
                  {person.program && (
                    <span className="block text-xs text-ink-muted sm:text-sm">
                      {person.program.title}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Spotlight id={spotlightId} person={selected} label={t('spotlightLabel')} />
    </>
  );
}

function Spotlight({
  id,
  person,
  label,
}: {
  id: string;
  person: InstructorProfile;
  label: string;
}) {
  const t = useTranslations('Landing.instructors');
  return (
    <div
      id={id}
      role="region"
      aria-label={label}
      aria-live="polite"
      className="mt-12 grid items-center gap-10 rounded-[var(--radius-card)] border-t-2 border-gold-500 bg-white p-8 shadow-sm md:grid-cols-[auto_1fr] lg:p-12"
    >
      <div className="relative mx-auto size-60 overflow-hidden rounded-full border border-gold-500/60 lg:size-80">
        {person.photoPath && (
          <Image
            src={person.photoPath}
            alt={person.name}
            fill
            sizes="(min-width: 1024px) 20rem, 15rem"
            className="object-cover object-top"
          />
        )}
      </div>
      <div>
        {person.program && (
          <p className="font-mono text-sm text-gold-700">{person.program.title}</p>
        )}
        <h3 className="mt-2 text-3xl font-semibold text-ink">{person.name}</h3>
        <p className="mt-3 font-semibold text-crimson-700">{person.role}</p>
        <span className="mt-4 block h-0.5 w-16 bg-gold-500" aria-hidden="true" />
        <p className="mt-4 max-w-2xl leading-relaxed text-ink">{person.bio}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={bookMentorPath(person.id)}>{t('bookMentoring')}</ButtonLink>
          {person.program && (
            <ButtonLink href={programPath(person.program.slug)} variant="secondary">
              {t('viewProgram')}
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
