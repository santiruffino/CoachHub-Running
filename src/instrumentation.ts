import * as Sentry from '@sentry/nextjs';
import { initConsoleInterceptor } from '@/lib/logging/console-interceptor';
import { reportHandledError } from '@/lib/sentry/report-handled-error';

export async function register() {
  const runtime = process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'server';

  initConsoleInterceptor({
    runtime,
    onError: (error, context) => {
      reportHandledError(error, {
        runtime: context.runtime === 'edge' ? 'edge' : 'server',
        event: `console.${context.method}`,
        tags: {
          source: 'console',
          method: context.method,
        },
      });
    },
  });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
