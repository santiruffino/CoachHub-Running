import * as Sentry from '@sentry/nextjs';
import { initConsoleInterceptor } from '@/lib/logging/console-interceptor';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
  sendDefaultPii: false,
  replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 1.0),
  replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0.05),
  integrations: [Sentry.browserTracingIntegration()],
});

initConsoleInterceptor({
  runtime: 'client',
  onError: (error, context) => {
    Sentry.captureException(error, {
      tags: {
        source: 'console',
        runtime: context.runtime,
        method: context.method,
      },
    });
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
