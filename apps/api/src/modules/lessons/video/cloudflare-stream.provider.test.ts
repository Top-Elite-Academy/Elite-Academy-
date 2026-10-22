import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../../config/app-config';
import { CloudflareStreamProvider } from './cloudflare-stream.provider';

const config = {
  video: {
    provider: 'cloudflare',
    cloudflare: { accountId: 'acct', apiToken: 'secret-token', customerCode: 'customer-abc' },
  },
} as unknown as AppConfig;

const provider = new CloudflareStreamProvider(config);

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('CloudflareStreamProvider', () => {
  it('asks for a one-time tus upload that requires signed playback', async () => {
    const fetchMock = stubFetch(
      new Response(null, {
        status: 201,
        headers: {
          location: 'https://upload.cloudflarestream.com/tus/abc',
          'stream-media-id': 'vid123',
        },
      }),
    );
    const result = await provider.createUpload({
      videoId: 'v1',
      fileName: 'lesson.mp4',
      sizeBytes: 1000,
    });
    expect(result).toEqual({
      providerVideoId: 'vid123',
      upload: { protocol: 'tus', url: 'https://upload.cloudflarestream.com/tus/abc' },
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(
      'https://api.cloudflare.com/client/v4/accounts/acct/stream?direct_user=true',
    );
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer secret-token',
      'Upload-Length': '1000',
      'Upload-Metadata': `name ${Buffer.from('lesson.mp4').toString('base64')},requiresignedurls`,
    });
  });

  it('maps Cloudflare states', async () => {
    stubFetch(Response.json({ result: { status: { state: 'inprogress' }, duration: -1 } }));
    expect(await provider.state('vid123')).toEqual({ status: 'processing', durationSec: null });
    stubFetch(Response.json({ result: { status: { state: 'ready' }, duration: 3130.4 } }));
    expect(await provider.state('vid123')).toEqual({ status: 'ready', durationSec: 3130 });
    stubFetch(Response.json({ result: { status: { state: 'error' } } }));
    expect((await provider.state('vid123')).status).toBe('failed');
  });

  it('plays through the Stream player with a signed token', async () => {
    stubFetch(Response.json({ result: { token: 'signed.jwt.token' } }));
    expect(await provider.playback('vid123')).toEqual({
      kind: 'iframe',
      url: 'https://customer-abc.cloudflarestream.com/signed.jwt.token/iframe',
    });
  });

  it('fails clearly when Cloudflare refuses the upload', async () => {
    stubFetch(new Response(null, { status: 403 }));
    await expect(
      provider.createUpload({ videoId: 'v1', fileName: 'x.mp4', sizeBytes: 1 }),
    ).rejects.toThrow('HTTP 403');
  });
});
