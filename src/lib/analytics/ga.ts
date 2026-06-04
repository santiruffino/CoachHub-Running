import { locales } from '@/i18n/config';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 100;
const localePrefixPattern = new RegExp(`^/(${locales.join('|')})(?=/|$)`);

export function stripLocale(pathname: string): string {
  return pathname.replace(localePrefixPattern, '');
}

let pendingUrl: string | null = null;
let retries = 0;

function tryFlush() {
  if (!pendingUrl) return;
  if (typeof window.gtag === 'function' && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: pendingUrl });
    pendingUrl = null;
    retries = 0;
    return;
  }
  if (retries++ < MAX_RETRIES) {
    window.setTimeout(tryFlush, RETRY_INTERVAL_MS);
  } else {
    pendingUrl = null;
    retries = 0;
  }
}

export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
    return;
  }

  if (typeof window.gtag === 'function') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
    pendingUrl = null;
    retries = 0;
    return;
  }

  pendingUrl = url;
  tryFlush();
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', event, params || {});
}
