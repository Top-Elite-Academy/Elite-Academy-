'use client';

import type { StudentLesson } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/api/client';

/** How often the playing position is saved, so the student can continue later. */
const SAVE_EVERY_SEC = 30;

type Video = StudentLesson['videos'][number];

/**
 * The lesson's videos. Our own files play in <video> and continue where the
 * student stopped; Cloudflare Stream plays in its signed player.
 */
export function LessonVideo({
  lessonId,
  videos,
  positionSec,
}: {
  lessonId: string;
  videos: Video[];
  positionSec: number;
}) {
  const t = useTranslations('StudentLesson');
  if (videos.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-border bg-white p-6 text-ink-muted">
        {t('noVideo')}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {videos.map((video, index) => {
        const title = t('videoPart', { number: index + 1, total: videos.length });
        return (
          <figure key={video.id} className="flex flex-col gap-1">
            <div className="aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink">
              {video.playback.kind === 'iframe' ? (
                <iframe
                  src={video.playback.url}
                  title={title}
                  className="size-full border-0"
                  allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <FileVideo
                  lessonId={lessonId}
                  url={video.playback.url}
                  title={title}
                  // Only the first video remembers where the student stopped.
                  resumeAt={index === 0 ? positionSec : null}
                />
              )}
            </div>
            {videos.length > 1 && (
              <figcaption className="text-sm text-ink-muted">{title}</figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

function FileVideo({
  lessonId,
  url,
  title,
  resumeAt,
}: {
  lessonId: string;
  url: string;
  title: string;
  resumeAt: number | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    const video = ref.current;
    if (!video || resumeAt === null) return;
    const save = (force: boolean) => {
      const position = Math.floor(video.currentTime);
      if (!force && Math.abs(position - lastSaved.current) < SAVE_EVERY_SEC) return;
      lastSaved.current = position;
      // Losing a position is harmless; never interrupt playback for it.
      apiRequest('POST', `/api/me/lessons/${lessonId}/progress`, { positionSec: position }).catch(
        () => undefined,
      );
    };
    const resume = () => {
      if (resumeAt > 0 && resumeAt < video.duration - 5) video.currentTime = resumeAt;
      lastSaved.current = resumeAt;
    };
    const onTime = () => {
      save(false);
    };
    const onPause = () => {
      save(true);
    };
    video.addEventListener('loadedmetadata', resume, { once: true });
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('loadedmetadata', resume);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('pause', onPause);
    };
  }, [lessonId, resumeAt]);

  return (
    // Captions are not uploaded yet; they come with the caption upload step.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={ref}
      src={url}
      title={title}
      aria-label={title}
      controls
      preload="metadata"
      className="size-full"
    />
  );
}
