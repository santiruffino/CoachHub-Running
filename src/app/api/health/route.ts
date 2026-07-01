import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Health Check
 *
 * Verifies connectivity to critical dependencies (Supabase) so external
 * uptime monitors can detect outages proactively, not just via Sentry
 * exceptions after the fact. Reports to Sentry on failure so an alert
 * rule can be configured against the `health_check.degraded` fingerprint.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    checks.supabase = error ? 'error' : 'ok';
    if (error) {
      Sentry.captureMessage('health_check.degraded', {
        level: 'error',
        fingerprint: ['health_check.degraded', 'supabase'],
        tags: { check: 'supabase' },
        extra: { error },
      });
    }
  } catch (error) {
    checks.supabase = 'error';
    Sentry.captureMessage('health_check.degraded', {
      level: 'error',
      fingerprint: ['health_check.degraded', 'supabase'],
      tags: { check: 'supabase' },
      extra: { error },
    });
  }

  const healthy = Object.values(checks).every((status) => status === 'ok');

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
