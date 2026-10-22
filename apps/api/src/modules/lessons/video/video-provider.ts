/**
 * Lesson video hosting (spec §4.8: adaptive streaming, signed expiring links).
 * Cloudflare Stream in production; a local stand-in during development.
 */

/** How the browser sends the file. */
export type VideoUpload =
  /** Resumable upload straight to the provider (Cloudflare Stream). */
  | { protocol: 'tus'; url: string }
  /** A plain PUT of the whole file to this API path (local development). */
  | { protocol: 'put'; url: `/api/${string}` };

export type VideoPlayback =
  /** A video file the page plays with <video>. */
  | { kind: 'file'; url: string }
  /** The provider's own player in an iframe (signed token in the URL). */
  | { kind: 'iframe'; url: string };

export interface VideoState {
  status: 'processing' | 'ready' | 'failed';
  durationSec: number | null;
}

export abstract class VideoProvider {
  abstract readonly name: 'local' | 'cloudflare';

  /** Reserves the upload; returns the provider's id for the video and where to send it. */
  abstract createUpload(input: {
    videoId: string;
    fileName: string;
    sizeBytes: number;
  }): Promise<{ providerVideoId: string; upload: VideoUpload }>;

  /** After the upload: is it ready to watch? */
  abstract state(providerVideoId: string): Promise<VideoState>;

  /** A short-lived way to watch it. */
  abstract playback(providerVideoId: string): Promise<VideoPlayback>;

  abstract remove(providerVideoId: string): Promise<void>;
}
