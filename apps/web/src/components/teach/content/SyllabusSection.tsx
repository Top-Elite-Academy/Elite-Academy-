'use client';

import type { SyllabusFileView } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DownloadIcon } from '@/components/ui/icons';
import { teachSyllabusDownloadPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest, apiUpload } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';
import { formatFileSize } from '@/lib/format/file-size';
import { DropZone } from './DropZone';

const TONE: Record<SyllabusFileView['scanStatus'], BadgeTone> = {
  scanning: 'gold',
  clean: 'sage',
  infected: 'danger',
  failed: 'danger',
};
/** How often to look again while a new upload is being scanned. */
const REFRESH_MS = 3_000;

/**
 * The program's syllabus PDF (spec §3.4, §6.2): confirmed students download it
 * from their course page. A new upload replaces the current one once it
 * passes the virus scan.
 */
export function SyllabusSection({
  programId,
  files,
}: {
  programId: string;
  /** Uploaded versions, newest first. */
  files: SyllabusFileView[];
}) {
  const t = useTranslations('TeachContent.syllabus');
  const tFiles = useTranslations('TeachContent.files');
  const errorMessage = useErrorMessage();
  const locale = useLocale();
  const router = useRouter();
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = files.find((file) => file.scanStatus === 'clean');
  const scanning = files.some((file) => file.scanStatus === 'scanning');

  useEffect(() => {
    if (!scanning) return;
    const timer = setInterval(() => {
      router.refresh();
    }, REFRESH_MS);
    return () => {
      clearInterval(timer);
    };
  }, [scanning, router]);

  const upload = async ([file]: File[]) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await apiUpload(`/api/teach/programs/${programId}/syllabus`, form);
      router.refresh();
    } catch (caught) {
      setError(`${file.name}: ${errorMessage(caught)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-semibold text-ink">
          {t('title')}
        </h2>
        <p className="text-sm text-ink-muted">{t('intro')}</p>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('none')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-border px-4 py-3"
            >
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-semibold text-ink" dir="ltr">
                  {file.fileName}
                </span>
                <span className="block text-xs text-ink-muted">
                  {formatFileSize(file.sizeBytes, locale)}
                  {file === current && ` · ${t('current')}`}
                  {file.scanStatus === 'scanning' && ` · ${t('replacesAfterScan')}`}
                </span>
              </span>
              <Badge tone={TONE[file.scanStatus]}>{tFiles(`scan.${file.scanStatus}`)}</Badge>
              {file.scanStatus === 'clean' && (
                <a
                  href={teachSyllabusDownloadPath(file.id)}
                  className="inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-crimson-700 underline"
                >
                  <DownloadIcon className="size-4" aria-hidden="true" />
                  {t('download')}
                </a>
              )}
              <ConfirmDialog
                trigger={t('delete')}
                triggerVariant="ghost"
                srContext={file.fileName}
                title={t('deleteTitle')}
                body={t(file === current ? 'deleteCurrentBody' : 'deleteBody')}
                cancelLabel={t('keep')}
                confirmLabel={t('delete')}
                onConfirm={async () => {
                  await apiRequest('DELETE', `/api/teach/syllabus/${file.id}`);
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <p role="status" className="text-sm text-ink-muted">
          {t('uploading')}
        </p>
      )}
      <DropZone
        accept=".pdf,application/pdf"
        prompt={t(current ? 'replace' : 'add')}
        chooseLabel={t(current ? 'replace' : 'add')}
        hint={t('allowed')}
        onFiles={(chosen) => void upload(chosen)}
      />
      {error && <FormAlert tone="error">{error}</FormAlert>}
    </section>
  );
}
