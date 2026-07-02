import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { syncStravaActivities } from '@/lib/strava/sync-activities';

export const maxDuration = 60;

const JOBS_PER_INVOCATION = 5;
const STUCK_JOB_TIMEOUT = '10 minutes';

interface StravaConnectionRow {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface ClaimedJobRow {
  id: string;
  user_id: string;
  window_days: number;
}

async function refreshTokenIfNeeded(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  connection: StravaConnectionRow
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (connection.expires_at > now + 60) {
    return connection.access_token;
  }

  const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    throw new Error('FAILED_TO_REFRESH_STRAVA_TOKEN');
  }

  const tokenData = (await refreshResponse.json()) as StravaTokenResponse;

  await supabase
    .from('strava_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return tokenData.access_token;
}

/**
 * Processes queued Strava activity backfill jobs (see `activity_backfill_jobs`).
 * Jobs are claimed atomically via the `claim_activity_backfill_jobs` RPC
 * (SELECT FOR UPDATE SKIP LOCKED under the hood), so concurrent/overlapping
 * cron invocations never process the same job twice. Runs sequentially
 * within a single invocation because all jobs share one Strava API rate
 * budget (see `sync-activities.ts`) — parallelizing here wouldn't increase
 * throughput, only make each job wait longer at the limiter.
 * Triggered by Vercel Cron (see vercel.json).
 */
export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/cron/strava-backfill', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('strava_backfill_cron.unauthorized');
    return respond(apiError('AUTH_UNAUTHORIZED'), { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: claimedJobs, error: claimError } = await supabase.rpc(
      'claim_activity_backfill_jobs',
      { p_limit: JOBS_PER_INVOCATION, p_stuck_after: STUCK_JOB_TIMEOUT }
    );

    if (claimError) {
      logger.error('strava_backfill_cron.claim_failed', { error: claimError });
      return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }

    const jobs = (claimedJobs || []) as ClaimedJobRow[];
    if (jobs.length === 0) {
      return respond({ success: true, processed: 0 });
    }

    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const { data: connection, error: connError } = await supabase
          .from('strava_connections')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', job.user_id)
          .single();

        if (connError || !connection) {
          throw new Error('STRAVA_NOT_CONNECTED');
        }

        const accessToken = await refreshTokenIfNeeded(
          supabase,
          job.user_id,
          connection as StravaConnectionRow
        );

        const result = await syncStravaActivities(supabase, job.user_id, accessToken, {
          days: job.window_days,
        });

        await supabase
          .from('activity_backfill_jobs')
          .update({
            status: 'success',
            activities_processed: result.total,
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        succeeded += 1;
      } catch (error) {
        logger.error('strava_backfill_cron.job_failed', { jobId: job.id, userId: job.user_id, error });
        await supabase
          .from('activity_backfill_jobs')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'BACKFILL_FAILED',
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        failed += 1;
      }
    }

    return respond({ success: true, processed: jobs.length, succeeded, failed });
  } catch (error: unknown) {
    logger.error('strava_backfill_cron.unhandled_error', { error });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
