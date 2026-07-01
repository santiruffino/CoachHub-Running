// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const defaultTracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || defaultTracesSampleRate),

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Avoid sending user PII (IP, cookies, etc.) by default; attach user context explicitly via Sentry.setUser() where needed.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});
