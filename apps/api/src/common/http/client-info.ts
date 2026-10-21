import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Who is calling, for audit logs, rate limits and session records. */
export interface ClientInfo {
  ip: string;
  userAgent: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- the official way to extend Express types
  namespace Express {
    interface Request {
      /** Resolved once per request by clientIpMiddleware. */
      clientIp?: string;
    }
  }
}

/**
 * Resolves the caller's IP once per request.
 *
 * `X-Forwarded-For` is NOT trusted: a browser can send any value and the web
 * proxy keeps it. Instead, `headerName` (CLIENT_IP_HEADER) names a header that
 * the edge always overwrites, e.g. Cloudflare's `cf-connecting-ip`. Without it,
 * the socket address is used (local development).
 */
export function clientIpMiddleware(headerName: string | undefined) {
  const header = headerName?.toLowerCase();
  return (request: Request, _response: Response, next: NextFunction) => {
    const fromEdge = header ? request.get(header)?.split(',')[0]?.trim() : undefined;
    request.clientIp = fromEdge?.slice(0, 64) || request.socket.remoteAddress || 'unknown';
    next();
  };
}

export function clientInfoOf(request: Request): ClientInfo {
  return {
    ip: request.clientIp ?? request.socket.remoteAddress ?? 'unknown',
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
  };
}

export const Client = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  clientInfoOf(context.switchToHttp().getRequest<Request>()),
);
