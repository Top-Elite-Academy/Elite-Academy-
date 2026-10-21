'use client';

import type { MentorCard } from '@eta/shared';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { BriefcaseIcon, UsersIcon } from '@/components/ui/icons';
import { bookMentorPath } from '@/config/navigation';

/** Mentor card (spec §3.5): photo, name, specialty, languages, session length, price, booking link. */
export function MentorCardView({
  mentor,
  service,
  priceLabel,
}: {
  mentor: MentorCard;
  /** Package code for the booking link, e.g. "mentoring-8" or "career". */
  service: string;
  /** Already formatted, e.g. "₪250". */
  priceLabel: string | null;
}) {
  const t = useTranslations('Mentoring');
  const locale = useLocale();
  const languageNames = new Intl.DisplayNames(locale, { type: 'language' });
  const isCareer = mentor.kind === 'career';

  return (
    <article className="flex w-full flex-col rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm">
      <div className="flex gap-3">
        <Avatar mentor={mentor} />
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{mentor.name}</h3>
          <p className="text-sm text-ink-muted">
            {mentor.program
              ? t('mentors.instructorOf', { program: mentor.program.title })
              : mentor.role}
          </p>
          <div className="mt-2">
            {isCareer ? (
              <Badge tone="slate" icon={<BriefcaseIcon className="size-3.5" />}>
                {t('services.career.badge')}
              </Badge>
            ) : (
              <Badge tone="sage" icon={<UsersIcon className="size-3.5" />}>
                {t('services.mentoring.badge')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {mentor.skills.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {mentor.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-full border border-ink/20 px-2.5 py-0.5 text-xs text-ink"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 mb-auto grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-ink-muted">{t('mentors.languages')}</dt>
          <dd className="font-semibold text-ink">
            {mentor.languages.map((code) => languageNames.of(code)).join(', ')}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t('mentors.sessionLength')}</dt>
          <dd className="font-semibold text-ink">
            {t('mentors.minutes', { minutes: mentor.sessionMinutes })}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {priceLabel && (
          <p className="font-semibold text-ink">{t('mentors.perSession', { price: priceLabel })}</p>
        )}
        <ButtonLink href={bookMentorPath(mentor.id, service)} size="sm">
          {t('mentors.book')}
          <span className="sr-only">{`: ${mentor.name}`}</span>
        </ButtonLink>
      </div>
    </article>
  );
}

function Avatar({ mentor }: { mentor: MentorCard }) {
  if (mentor.photoPath) {
    return (
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-gold-500/60">
        <Image
          src={mentor.photoPath}
          alt=""
          fill
          sizes="3rem"
          className="object-cover object-top"
        />
      </span>
    );
  }
  const initials = mentor.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-crimson-50 font-semibold text-crimson-700"
    >
      {initials}
    </span>
  );
}
