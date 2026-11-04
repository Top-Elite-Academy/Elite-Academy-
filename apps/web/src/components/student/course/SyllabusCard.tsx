import type { StudentSyllabus } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { DownloadIcon } from '@/components/ui/icons';
import { buttonClasses } from '@/components/ui/Button';
import { formatFileSize } from '@/lib/format/file-size';
import { useBookingFormat } from '@/lib/format/use-booking-format';

/** The program syllabus on the student's course page: name, size, last update and a download. */
export function SyllabusCard({ syllabus, href }: { syllabus: StudentSyllabus; href: string }) {
  const t = useTranslations('StudentLesson.syllabus');
  const locale = useLocale();
  const when = useBookingFormat();
  return (
    <section
      aria-labelledby="syllabus-title"
      className="flex max-w-2xl flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-border bg-white p-5"
    >
      <div className="min-w-0 flex-1">
        <h2 id="syllabus-title" className="font-semibold text-ink">
          {t('title')}
        </h2>
        <p className="text-sm text-ink-muted">
          <span dir="ltr">{formatFileSize(syllabus.sizeBytes, locale)}</span> ·{' '}
          {t('updated', { when: when.dayTime(syllabus.updatedAt) })}
        </p>
      </div>
      <a
        href={href}
        aria-label={t('downloadNamed', { name: syllabus.fileName })}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        <DownloadIcon className="size-4" aria-hidden="true" />
        {t('download')}
      </a>
    </section>
  );
}
