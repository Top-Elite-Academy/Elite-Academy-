import { Injectable } from '@nestjs/common';
import { FileStorage } from '../../../common/files/file-storage';
import { type VideoPlayback, VideoProvider, type VideoState } from './video-provider';

/** How long a playback link works; the page asks for a new one when it reloads. */
const PLAYBACK_SECONDS = 2 * 60 * 60;

/**
 * Development stand-in: the video is stored as-is in the file storage and the
 * page plays the file directly (no adaptive streaming, no captions).
 */
@Injectable()
export class LocalVideoProvider extends VideoProvider {
  readonly name = 'local' as const;

  constructor(private readonly storage: FileStorage) {
    super();
  }

  createUpload(input: { videoId: string }) {
    return Promise.resolve({
      providerVideoId: `videos/${input.videoId}`,
      upload: {
        protocol: 'put' as const,
        url: `/api/teach/videos/${input.videoId}/content` as const,
      },
    });
  }

  /** The API marks the video ready once the PUT has finished. */
  state(): Promise<VideoState> {
    return Promise.resolve({ status: 'ready', durationSec: null });
  }

  async playback(providerVideoId: string): Promise<VideoPlayback> {
    return {
      kind: 'file',
      url: await this.storage.signedUrl(providerVideoId, { expiresInSeconds: PLAYBACK_SECONDS }),
    };
  }

  async remove(providerVideoId: string): Promise<void> {
    await this.storage.delete(providerVideoId);
  }
}
