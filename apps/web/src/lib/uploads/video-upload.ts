'use client';

import type { VideoUploadTarget } from '@eta/shared';
import { Upload } from 'tus-js-client';
import { getCsrfToken } from '@/lib/api/client';

export interface UploadCallbacks {
  onProgress: (sent: number, total: number) => void;
  onDone: () => void;
  onError: () => void;
}

export interface RunningUpload {
  /** Only resumable uploads can pause. */
  canPause: boolean;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

/** Cloudflare Stream: resumable (tus) in 50 MB pieces; survives dropped connections. */
function tusUpload(file: File, url: string, callbacks: UploadCallbacks): RunningUpload {
  const upload = new Upload(file, {
    uploadUrl: url,
    chunkSize: 50 * 1024 * 1024,
    retryDelays: [0, 3_000, 10_000, 30_000],
    onProgress: callbacks.onProgress,
    onSuccess: callbacks.onDone,
    onError: callbacks.onError,
  });
  upload.start();
  return {
    canPause: true,
    pause: () => void upload.abort(),
    resume: () => {
      upload.start();
    },
    cancel: () => void upload.abort(true),
  };
}

/** Local stand-in: the whole file in one PUT to the API (with progress). */
function putUpload(file: File, url: string, callbacks: UploadCallbacks): RunningUpload {
  const request = new XMLHttpRequest();
  request.upload.onprogress = (event) => {
    callbacks.onProgress(event.loaded, event.total);
  };
  request.onload = () => {
    if (request.status >= 200 && request.status < 300) callbacks.onDone();
    else callbacks.onError();
  };
  request.onerror = callbacks.onError;
  void getCsrfToken()
    .then((token) => {
      request.open('PUT', url);
      request.setRequestHeader('X-CSRF-Token', token);
      request.setRequestHeader('Content-Type', file.type || 'video/mp4');
      request.send(file);
    })
    .catch(callbacks.onError);
  return {
    canPause: false,
    pause: () => undefined,
    resume: () => undefined,
    cancel: () => {
      request.abort();
    },
  };
}

/** Starts sending the file where the API said (see VideoProvider in the API). */
export function startVideoUpload(
  file: File,
  target: VideoUploadTarget,
  callbacks: UploadCallbacks,
): RunningUpload {
  return target.protocol === 'tus'
    ? tusUpload(file, target.url, callbacks)
    : putUpload(file, target.url, callbacks);
}
