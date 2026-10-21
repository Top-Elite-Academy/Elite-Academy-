import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Every deliberate API error. `code` is a translation key the web app shows
 * in the user's language (messages/*.json → "errors.<code>").
 */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    readonly extra: { captchaRequired?: boolean; retryAfterSeconds?: number } = {},
  ) {
    super(code, status);
  }

  static badRequest(code: string, extra?: ApiException['extra']): ApiException {
    return new ApiException(HttpStatus.BAD_REQUEST, code, extra);
  }

  static unauthorized(code = 'auth.required', extra?: ApiException['extra']): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, code, extra);
  }

  static forbidden(code = 'auth.forbidden'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, code);
  }

  /** Also used when a record exists but the caller may not see it, so ids cannot be probed. */
  static notFound(code = 'notFound'): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, code);
  }

  static conflict(code: string): ApiException {
    return new ApiException(HttpStatus.CONFLICT, code);
  }

  static tooManyRequests(retryAfterSeconds: number, code = 'rateLimited'): ApiException {
    return new ApiException(HttpStatus.TOO_MANY_REQUESTS, code, { retryAfterSeconds });
  }
}
