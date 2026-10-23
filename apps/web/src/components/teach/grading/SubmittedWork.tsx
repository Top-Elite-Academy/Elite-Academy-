import type { TeachSubmission } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { LateBadge, ScanBadge } from '@/components/assignments/SubmissionBadges';
import { DownloadIcon } from '@/components/ui/icons';
import { submissionFileDownloadPath } from '@/config/navigation';
import { formatFileSize } from '@/lib/format/file-size';
import { useBookingFormat } from '@/lib/format/use-booking-format';

/** What the student handed in: when, the GitHub link, their note and files. */
export function SubmittedWork({ submission }: { submission: TeachSubmission }) {
  const t = useTranslations('TeachGrading');
  const locale = useLocale();
  const when = useBookingFormat();
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
          {t('assignmentLine', {
            number: submission.assignment.lessonPosition,
            title: submission.assignment.title,
          })}
        </p>
        <h2 className="font-display text-2xl font-semibold text-ink">
          {`${submission.student.firstName} ${submission.student.lastName}`}
        </h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>
            {t('handedIn', {
              when: when.dayTime(submission.submittedAt),
              due: when.dayTime(submission.dueAt),
            })}
          </span>
          <LateBadge days={submission.lateDays} />
        </p>
      </header>
      {submission.repoUrl && (
        <p className="text-sm">
          <span className="font-semibold text-ink">{t('repo')} </span>
          <a
            href={submission.repoUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            dir="ltr"
            className="break-all text-crimson-700 underline"
          >
            {submission.repoUrl}
          </a>
        </p>
      )}
      {submission.note && (
        <blockquote className="border-s-4 border-border ps-4 text-sm whitespace-pre-line text-ink">
          {submission.note}
        </blockquote>
      )}
      {submission.files.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-control)] border border-border">
          {submission.files.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span dir="ltr" className="min-w-0 flex-1 break-all text-ink">
                {file.fileName}
              </span>
              <span dir="ltr" className="text-ink-muted">
                {formatFileSize(file.sizeBytes, locale)}
              </span>
              <ScanBadge status={file.scanStatus} />
              {file.scanStatus === 'clean' && (
                <a
                  href={submissionFileDownloadPath('teach', submission.id, file.id)}
                  aria-label={t('download', { name: file.fileName })}
                  className="inline-flex min-h-11 items-center gap-1 px-2 font-semibold text-crimson-700 underline"
                >
                  <DownloadIcon className="size-4" aria-hidden="true" />
                  {t('downloadShort')}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
