'use client';

import type { LessonFileKind, LessonFileView } from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CloseIcon, DownloadIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest, apiUpload } from '@/lib/api/client';
import { formatFileSize } from '@/lib/format/file-size';
import { DropZone } from './DropZone';

const TONE: Record<LessonFileView['scanStatus'], BadgeTone> = {
  scanning: 'gold',
  clean: 'sage',
  infected: 'danger',
  failed: 'danger',
};
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.txt,.md,.json,.ipynb,.zip,.py,.js,.ts,.sql';

/**
 * Lesson files of one kind, each virus-scanned before students see it:
 * "Downloads for students" (materials) in the lesson, or the exercise's own
 * files (starter code, data, a PDF brief) inside the exercise form.
 */
export function FilesSection({
  lessonId,
  kind,
  files,
}: {
  lessonId: string;
  kind: LessonFileKind;
  files: LessonFileView[];
}) {
  const t = useTranslations('TeachContent.files');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const headingId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const message = (caught: unknown) => {
    const code = caught instanceof ApiError ? caught.code : 'generic';
    return tErrors.has(code) ? tErrors(code as 'generic') : tErrors('generic');
  };

  const upload = async (chosen: File[]) => {
    setError(null);
    for (const file of chosen) {
      setBusy(file.name);
      const form = new FormData();
      form.append('kind', kind);
      form.append('file', file);
      try {
        await apiUpload(`/api/teach/lessons/${lessonId}/files`, form);
      } catch (caught) {
        setError(`${file.name}: ${message(caught)}`);
      }
    }
    setBusy(null);
    router.refresh();
  };

  const remove = async (file: LessonFileView) => {
    try {
      await apiRequest('DELETE', `/api/teach/files/${file.id}`);
      router.refresh();
    } catch (caught) {
      setError(message(caught));
    }
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-sm font-semibold text-ink">
          {t(kind === 'exercise' ? 'exerciseTitle' : 'title')}
        </h3>
        {kind === 'exercise' && <p className="text-sm text-ink-muted">{t('exerciseHint')}</p>}
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-white px-4 py-3"
            >
              <DownloadIcon className="size-5 text-ink-muted" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-semibold text-ink">{file.fileName}</span>
                <span className="block text-xs text-ink-muted">
                  {`${t(`kinds.${file.kind}`)} · ${formatFileSize(file.sizeBytes, locale)}`}
                  {file.scanStatus === 'scanning' && ` · ${t('scanningNote')}`}
                </span>
              </span>
              <Badge tone={TONE[file.scanStatus]}>{t(`scan.${file.scanStatus}`)}</Badge>
              <Button variant="ghost" size="sm" onClick={() => void remove(file)}>
                <CloseIcon className="size-4" />
                <span className="sr-only">{t('remove', { name: file.fileName })}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {busy && (
        <p role="status" className="text-sm text-ink-muted">
          {t('uploading', { name: busy })}
        </p>
      )}
      <DropZone
        accept={ACCEPT}
        multiple
        prompt={t('add')}
        chooseLabel={t('add')}
        hint={t('allowed')}
        onFiles={(chosen) => void upload(chosen)}
      />
      {error && <FormAlert tone="error">{error}</FormAlert>}
    </section>
  );
}
