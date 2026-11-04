import type { StudentLesson } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { DownloadIcon } from '@/components/ui/icons';
import { lessonFileDownloadPath } from '@/config/navigation';
import { formatFileSize } from '@/lib/format/file-size';

/** Scanned lesson files with their type, size and a download link (short-lived, from the API). */
export function LessonFileList({
  lessonId,
  files,
}: {
  lessonId: string;
  files: StudentLesson['files'];
}) {
  const t = useTranslations('StudentLesson');
  const locale = useLocale();
  return (
    <ul className="flex flex-col divide-y divide-border">
      {files.map((file) => (
        <li key={file.id} className="flex flex-wrap items-center gap-3 py-3">
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink">
            {t(`kind.${file.kind}`)}
          </span>
          <span className="min-w-0 flex-1 break-all text-ink" dir="ltr">
            {file.fileName}
          </span>
          <span className="text-sm text-ink-muted" dir="ltr">
            {formatFileSize(file.sizeBytes, locale)}
          </span>
          <a
            href={lessonFileDownloadPath(lessonId, file.id)}
            aria-label={t('download', { name: file.fileName })}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-sm font-semibold text-crimson-700 underline"
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            {t('downloadShort')}
          </a>
        </li>
      ))}
    </ul>
  );
}
