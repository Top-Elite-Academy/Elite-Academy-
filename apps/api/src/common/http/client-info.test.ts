import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { clientIpMiddleware } from './client-info';

function fakeRequest(headers: Record<string, string>, socketIp = '10.0.0.1'): Request {
  return {
    socket: { remoteAddress: socketIp },
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

function resolve(headerName: string | undefined, request: Request): string | undefined {
  clientIpMiddleware(headerName)(request, {} as Response, () => undefined);
  return request.clientIp;
}

describe('clientIpMiddleware', () => {
  it('ignores a forged X-Forwarded-For and uses the socket address', () => {
    const request = fakeRequest({ 'x-forwarded-for': '1.2.3.4' });
    expect(resolve(undefined, request)).toBe('10.0.0.1');
  });

  it('uses the configured edge header when present', () => {
    const request = fakeRequest({ 'cf-connecting-ip': '203.0.113.7' });
    expect(resolve('CF-Connecting-IP', request)).toBe('203.0.113.7');
  });

  it('falls back to the socket when the edge header is missing', () => {
    expect(resolve('cf-connecting-ip', fakeRequest({}))).toBe('10.0.0.1');
  });
});
