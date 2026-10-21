import type { ApiErrorBody } from '@eta/shared';

/** An error answer from the API. `code` is a translation key under "errors.". */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly captchaRequired: boolean;

  constructor(body: Partial<ApiErrorBody> & { statusCode: number }) {
    super(body.code ?? 'generic');
    this.status = body.statusCode;
    this.code = body.code ?? 'generic';
    this.fieldErrors = body.fieldErrors ?? {};
    this.captchaRequired = body.captchaRequired ?? false;
  }

  static network(): ApiError {
    return new ApiError({ statusCode: 0, code: 'network' });
  }
}
