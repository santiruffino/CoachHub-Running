import * as Sentry from '@sentry/nextjs';
import { initConsoleInterceptor } from '@/lib/logging/console-interceptor';

export async function register() {
  initConsoleInterceptor({ runtime: process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'server' });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
