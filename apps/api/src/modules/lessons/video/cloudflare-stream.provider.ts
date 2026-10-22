import { Injectable } from '@nestjs/common';
import { outboundFetch } from '../../../common/http/outbound-fetch';
import { AppConfig } from '../../../config/app-config';
import { type VideoPlayback, VideoProvider, type VideoState } from './video-provider';

const API = 'https://api.cloudflare.com/client/v4/accounts';
/** Signed playback tokens last two hours (Cloudflare's maximum is 24). */
const PLAYBACK_SECONDS = 2 * 60 * 60;

interface StreamVideo {
  status?: { state?: string };
  duration?: number;
}

/**
 * Cloudflare Stream. Uploads go straight from the browser to Cloudflare over
 * tus (resumable, large files); videos require signed URLs, so a student can
 * only watch with a fresh token the API hands out.
 */
@Injectable()
export class CloudflareStreamProvider extends VideoProvider {
  readonly name = 'cloudflare' as const;

  constructor(private readonly config: AppConfig) {
    super();
  }

  private get settings() {
    return this.config.video.cloudflare;
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.settings.apiToken}`, ...extra };
  }

  /** "Direct creator upload": Cloudflare returns a one-time tus URL for this file. */
  async createUpload(input: { videoId: string; fileName: string; sizeBytes: number }) {
    const metadata = [
      `name ${Buffer.from(input.fileName).toString('base64')}`,
      // Only playable with a signed token.
      'requiresignedurls',
    ].join(',');
    const response = await outboundFetch(
      `${API}/${this.settings.accountId}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: this.headers({
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(input.sizeBytes),
          'Upload-Metadata': metadata,
        }),
      },
    );
    const url = response.headers.get('location');
    const providerVideoId = response.headers.get('stream-media-id');
    if (!response.ok || !url || !providerVideoId)
      throw new Error(`Cloudflare Stream upload was refused: HTTP ${response.status}`);
    return { providerVideoId, upload: { protocol: 'tus' as const, url } };
  }

  async state(providerVideoId: string): Promise<VideoState> {
    const response = await outboundFetch(
      `${API}/${this.settings.accountId}/stream/${encodeURIComponent(providerVideoId)}`,
      { headers: this.headers() },
    );
    if (!response.ok) throw new Error(`Cloudflare Stream status failed: HTTP ${response.status}`);
    const { result } = (await response.json()) as { result: StreamVideo };
    const state = result.status?.state;
    return {
      status: state === 'ready' ? 'ready' : state === 'error' ? 'failed' : 'processing',
      durationSec: result.duration && result.duration > 0 ? Math.round(result.duration) : null,
    };
  }

  async playback(providerVideoId: string): Promise<VideoPlayback> {
    const response = await outboundFetch(
      `${API}/${this.settings.accountId}/stream/${encodeURIComponent(providerVideoId)}/token`,
      {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + PLAYBACK_SECONDS }),
      },
    );
    if (!response.ok) throw new Error(`Cloudflare Stream token failed: HTTP ${response.status}`);
    const { result } = (await response.json()) as { result: { token: string } };
    return {
      kind: 'iframe',
      url: `https://${this.settings.customerCode}.cloudflarestream.com/${result.token}/iframe`,
    };
  }

  async remove(providerVideoId: string): Promise<void> {
    await outboundFetch(
      `${API}/${this.settings.accountId}/stream/${encodeURIComponent(providerVideoId)}`,
      { method: 'DELETE', headers: this.headers() },
    );
  }
}
