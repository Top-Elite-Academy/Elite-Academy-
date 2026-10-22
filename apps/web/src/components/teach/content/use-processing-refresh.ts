'use client';

import type { TeachLesson } from '@eta/shared';
import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** How often to look again while a video is processing or a file is being scanned. */
const REFRESH_MS = 3_000;

/**
 * Keeps the lesson's statuses fresh while something is still in progress:
 * asks the video service about processing videos, then reloads the page data.
 */
export function useProcessingRefresh(lesson: TeachLesson) {
  const router = useRouter();
  const processing = lesson.videos.filter((video) => video.status === 'processing');
  const waiting =
    processing.length > 0 ||
    lesson.videos.some((video) => video.status === 'uploading') ||
    lesson.files.some((file) => file.scanStatus === 'scanning');
  const processingIds = processing.map((video) => video.id).join(',');

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      const ids = processingIds ? processingIds.split(',') : [];
      void Promise.all(ids.map((id) => apiRequest('POST', `/api/teach/videos/${id}/refresh`, {})))
        .catch(() => undefined)
        .finally(() => {
          router.refresh();
        });
    }, REFRESH_MS);
    return () => {
      clearInterval(timer);
    };
  }, [waiting, processingIds, router]);
}
