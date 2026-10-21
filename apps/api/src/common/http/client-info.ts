import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Who is calling, for audit logs, rate limits and session records. */
export interface ClientInfo {
  ip: string;
  userAgent: string | null;
}

export function clientInfoOf(request: Request): ClientInfo {
  // `request.ip` respects the "trust proxy" setting (TRUST_PROXY_HOPS), so it cannot be spoofed
  // with a forged X-Forwarded-For header when the API is not behind a proxy.
  return {
    ip: request.ip ?? 'unknown',
    userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
  };
}

export const Client = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  clientInfoOf(context.switchToHttp().getRequest<Request>()),
);
