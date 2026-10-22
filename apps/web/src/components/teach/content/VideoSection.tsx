'use client';

import {
  ALLOWED_VIDEO_EXTENSIONS,
  type CreateVideoResponse,
  extensionOf,
  type LessonVideoView,
  type TeachLessonList,
} from '@eta/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PlayIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';
import { formatFileSize } from '@/lib/format/file-size';
import { type RunningUpload, startVideoUpload } from '@/lib/uploads/video-upload';
import { DropZone } from './DropZone';

const TONE: Record<LessonVideoView['status'], BadgeTone> = {
  uploading: 'slate',
  processing: 'gold',
  ready: 'sage',
  failed: 'danger',
};

interface Active {
  name: string;
  sent: number;
  total: number;
  paused: boolean;
  upload: RunningUpload | null;
}

/** "Video" (design "Instructor 6"): uploaded videos and a drop zone for a new one. */
export function VideoSection({
  lessonId,
  videos,
  provider,
}: {
  lessonId: string;
  videos: LessonVideoView[];
  provider: TeachLessonList['videoProvider'];
}) {
  const t = useTranslations('TeachContent.video');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [active, setActive] = useState<Active | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<RunningUpload | null>(null);
  const progressId = useId();
  const size = (bytes: number) => formatFileSize(bytes, locale);

  const showError = (caught: unknown) => {
    const code = caught instanceof ApiError ? caught.code : 'generic';
    setError(tErrors.has(code) ? tErrors(code as 'generic') : t('uploadFailed'));
  };

  const upload = async (file: File) => {
    setError(null);
    if (!(ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
      setError(tErrors('video.type'));
      return;
    }
    try {
      const { upload: target } = await apiRequest<CreateVideoResponse>(
        'POST',
        `/api/teach/lessons/${lessonId}/videos`,
        { fileName: file.name, sizeBytes: file.size },
      );
      setActive({ name: file.name, sent: 0, total: file.size, paused: false, upload: null });
      activeRef.current = startVideoUpload(file, target, {
        onProgress: (sent, total) => {
          setActive((current) => (current ? { ...current, sent, total } : current));
        },
        onDone: () => {
          setActive(null);
          router.refresh();
        },
        onError: () => {
          setActive(null);
          setError(t('uploadFailed'));
          router.refresh();
        },
      });
      setActive((current) => (current ? { ...current, upload: activeRef.current } : current));
    } catch (caught) {
      showError(caught);
    }
  };

  const remove = async (video: LessonVideoView) => {
    try {
      await apiRequest('DELETE', `/api/teach/videos/${video.id}`);
      router.refresh();
    } catch (caught) {
      showError(caught);
    }
  };

  const percent = active && active.total ? Math.round((active.sent / active.total) * 100) : 0;

  return (
    <section aria-labelledby={`${progressId}-title`} className="flex flex-col gap-3">
      <h3 id={`${progressId}-title`} className="text-sm font-semibold text-ink">
        {t('title')}
      </h3>
      {videos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex items-center gap-3 rounded-[var(--radius-control)] border border-border bg-cream px-4 py-3"
            >
              <PlayIcon className="size-5 text-ink-muted" />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-semibold text-ink">{video.fileName}</span>
                <span className="block text-xs text-ink-muted">
                  {size(video.sizeBytes)}
                  {video.durationSec !== null &&
                    ` · ${t('duration', { minutes: Math.round(video.durationSec / 60) })}`}
                </span>
              </span>
              <Badge tone={TONE[video.status]}>{t(`status.${video.status}`)}</Badge>
              <Button variant="ghost" size="sm" onClick={() => void remove(video)}>
                {t('remove')}
                <span className="sr-only">{`: ${t('removeLabel', { name: video.fileName })}`}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {active ? (
        <div className="rounded-[var(--radius-control)] border border-border bg-white px-4 py-3">
          <p className="truncate text-sm font-semibold text-ink">{active.name}</p>
          <p id={progressId} className="mt-1 text-xs text-ink-muted">
            {t('sent', { sent: size(active.sent), percent })}
          </p>
          <progress
            aria-labelledby={progressId}
            max={100}
            value={percent}
            className="mt-2 h-2 w-full overflow-hidden rounded-full accent-crimson-700"
          />
          <div className="mt-2 flex gap-2">
            {active.upload?.canPause &&
              (active.paused ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    active.upload?.resume();
                    setActive({ ...active, paused: false });
                  }}
                >
                  {t('resume')}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    active.upload?.pause();
                    setActive({ ...active, paused: true });
                  }}
                >
                  {t('pause')}
                </Button>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                active.upload?.cancel();
                setActive(null);
                router.refresh();
              }}
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <DropZone
          accept="video/mp4,video/quicktime,video/x-m4v,video/webm"
          prompt={t('drop')}
          chooseLabel={t('choose')}
          hint={provider === 'local' ? t('hintLocal') : t('hint')}
          onFiles={(files) => {
            const [file] = files;
            if (file) void upload(file);
          }}
        />
      )}
      {error && <FormAlert tone="error">{error}</FormAlert>}
    </section>
  );
}
