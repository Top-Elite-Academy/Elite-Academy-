import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { clientIpMiddleware } from './common/http/client-info';
import { AppConfig } from './config/app-config';

export const API_PREFIX = 'api';
const DOCS_PATH = `${API_PREFIX}/docs`;

/** HTTP hardening shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfig);

  app.disable('x-powered-by');
  app.use(clientIpMiddleware(config.http.clientIpHeader));
  app.use(securityHeaders(config));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  // No CORS: the browser reaches the API only through the website's own origin (/api proxy).

  if (config.http.openApiEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Elite Tech Academy API').setVersion('1').build(),
    );
    SwaggerModule.setup(DOCS_PATH, app, cleanupOpenApiDoc(document));
  }
}

/**
 * API responses are JSON only, so the CSP is the strictest possible. The
 * Swagger page (development only) needs its own scripts and styles.
 */
function securityHeaders(config: AppConfig) {
  const common = {
    strictTransportSecurity: { maxAge: 63_072_000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    frameguard: { action: 'deny' as const },
  };
  const api = helmet({
    ...common,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  });
  const docs = helmet({
    ...common,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        frameAncestors: ["'none'"],
      },
    },
  });
  return (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const isDocs = config.http.openApiEnabled && request.path.startsWith(`/${DOCS_PATH}`);
    (isDocs ? docs : api)(request, response, next);
  };
}
