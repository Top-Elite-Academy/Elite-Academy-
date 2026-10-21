import type { ProgramInstructor } from '@eta/shared';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { GlobeIcon, UsersIcon } from '@/components/ui/icons';
import { bookMentorPath } from '@/config/navigation';
import { CourseSection } from '../CourseSection';

/** Photo, name, short bio (spec §3.3); instructors also offer mentoring (spec §3.5). */
export function InstructorSection({ instructor }: { instructor: ProgramInstructor | null }) {
  const t = useTranslations('Course.instructor');
  const locale = useLocale();
  if (!instructor) return null;
  const languageNames = new Intl.DisplayNames(locale, { type: 'language' });

  return (
    <CourseSection id="instructor" title={t('title')}>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-full border border-gold-500/60 bg-cream">
          {instructor.photoPath && (
            <Image
              src={instructor.photoPath}
              alt={instructor.name}
              fill
              sizes="6rem"
              className="object-cover object-top"
            />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-ink">{instructor.name}</h3>
          <p className="text-sm text-ink-muted">{instructor.role}</p>
          <p className="mt-3 leading-relaxed text-ink">{instructor.bio}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {instructor.languages.length > 0 && (
              <Badge icon={<GlobeIcon className="size-3.5" />}>
                {instructor.languages.map((code) => languageNames.of(code)).join(' · ')}
              </Badge>
            )}
            <Badge tone="sage" icon={<UsersIcon className="size-3.5" />}>
              {t('mentoring')}
            </Badge>
          </div>
          <ButtonLink
            href={bookMentorPath(instructor.id)}
            variant="secondary"
            size="sm"
            className="mt-5"
          >
            {t('book')}
          </ButtonLink>
        </div>
      </div>
    </CourseSection>
  );
}
