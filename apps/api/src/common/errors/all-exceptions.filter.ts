import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody } from '@eta/shared';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';
import { ApiException } from './api.exception';

const DEFAULT_CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'badRequest',
  [HttpStatus.UNAUTHORIZED]: 'auth.required',
  [HttpStatus.FORBIDDEN]: 'auth.forbidden',
  [HttpStatus.NOT_FOUND]: 'notFound',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'notFound',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'payloadTooLarge',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rateLimited',
};

/**
 * Turns every error into the same small JSON body. Stack traces and internal
 * messages are logged on the server and never sent to the client (spec §9.3).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    if (exception instanceof ApiException && exception.extra.retryAfterSeconds) {
      response.setHeader('Retry-After', String(exception.extra.retryAfterSeconds));
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ZodValidationException) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'validation',
        fieldErrors: fieldErrorsOf(exception.getZodError()),
      };
    }
    if (exception instanceof ApiException) {
      const body: ApiErrorBody = { statusCode: exception.getStatus(), code: exception.code };
      if (exception.extra.captchaRequired) body.captchaRequired = true;
      return body;
    }
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return { statusCode, code: DEFAULT_CODES[statusCode] ?? 'server.error' };
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: 'server.error' };
  }
}

/** { "email": ["email.invalid"] } — messages are already translation keys (see @eta/shared). */
function fieldErrorsOf(error: unknown): Record<string, string[]> {
  if (!isZodError(error)) return {};
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_form';
    const code = issue.code === 'unrecognized_keys' ? 'field.notAllowed' : issue.message;
    (fields[field] ??= []).push(code);
  }
  return fields;
}

function isZodError(error: unknown): error is ZodError {
  return error instanceof Error && Array.isArray((error as Partial<ZodError>).issues);
}
