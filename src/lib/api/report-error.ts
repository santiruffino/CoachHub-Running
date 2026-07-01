import * as Sentry from '@sentry/nextjs';
import { appLogger } from '@/lib/app-logger';

interface MinimalLogger {
  error: (event: string, metadata?: Record<string, unknown>) => void;
}

interface ReportApiErrorOptions {
  route: string;
  method?: string;
  requestId?: string;
  userId?: string;
  extra?: Record<string, unknown>;
  /** Pass the request-scoped logger from createRequestLogger when the route already has one. Defaults to appLogger. */
  logger?: MinimalLogger;
}

/**
 * Single place to log + report an unhandled API route error.
 * Keeps Sentry tagging consistent across routes instead of each one
 * repeating its own appLogger/Sentry.captureException boilerplate.
 */
export function reportApiError(error: unknown, options: ReportApiErrorOptions): void {
  const { route, method, requestId, userId, extra, logger = appLogger } = options;

  logger.error(`${route}.unhandled_error`, { error, method, requestId, userId, ...extra });

  Sentry.captureException(error, {
    tags: { route, ...(method ? { method } : {}) },
    extra: { requestId, userId, ...extra },
  });
}
