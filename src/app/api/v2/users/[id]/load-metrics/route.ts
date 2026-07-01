import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { ActivityLoadRow, buildDailyLoadSeries, classifyLoadRisk, estimateLoadFromActivity } from '@/lib/training/load';
import { normalizeCoachSettings } from '@/lib/settings/defaults';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

type RangeDays = 7 | 30 | 90;

type StravaConnectionRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  total_elevation_gain: number;
  average_speed?: number | null;
  max_speed?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  suffer_score?: number | null;
  private?: boolean;
};

type ActivityUpsertRow = {
  user_id: string;
  external_id: string;
  title: string;
  type: string;
  distance: number;
  duration: number;
  start_date: string;
  elapsed_time: number;
  elevation_gain: number;
  average_speed: number;
  max_speed: number;
  avg_hr: number | null;
  max_hr: number | null;
  suffer_score: number | null;
  load_score: number;
  is_private: boolean;
  metadata: StravaActivity;
  updated_at: string;
};

function parseRange(raw: string | null): RangeDays {
  if (raw === '7') return 7;
  if (raw === '90') return 90;
  return 30;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function runBackfillJob(jobId: string, targetUserId: string) {
  const serviceSupabase = createServiceRoleClient();

  try {
    await serviceSupabase
      .from('activity_backfill_jobs')
      .update({ status: 'running', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const { data: connection, error: connError } = await serviceSupabase
      .from('strava_connections')
      .select('user_id, access_token, refresh_token, expires_at')
      .eq('user_id', targetUserId)
      .single();

    if (connError || !connection) {
      throw new Error('STRAVA_NOT_CONNECTED');
    }

    let accessToken = (connection as StravaConnectionRow).access_token;
    const now = Math.floor(Date.now() / 1000);

    if ((connection as StravaConnectionRow).expires_at <= now + 60) {
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          refresh_token: (connection as StravaConnectionRow).refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('FAILED_TO_REFRESH_STRAVA_TOKEN');
      }

      const tokenData = (await refreshResponse.json()) as StravaTokenResponse;
      accessToken = tokenData.access_token;

      await serviceSupabase
        .from('strava_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId);
    }

    const afterTs = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    const dedupedActivities = new Map<string, StravaActivity>();

    for (let page = 1; page <= 5; page++) {
      const url = `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${afterTs}`;
      const activitiesResponse = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!activitiesResponse.ok) {
        throw new Error(`FAILED_TO_FETCH_ACTIVITIES_FROM_STRAVA:${activitiesResponse.status}`);
      }

      const pageActivities = (await activitiesResponse.json()) as StravaActivity[];
      for (const activity of pageActivities) {
        dedupedActivities.set(activity.id.toString(), activity);
      }

      if (pageActivities.length < 200) break;
    }

    const upsertRows: ActivityUpsertRow[] = Array.from(dedupedActivities.values()).map((activity) => {
      const sufferScore = typeof activity.suffer_score === 'number' ? activity.suffer_score : null;
      const loadScore = estimateLoadFromActivity({
        start_date: activity.start_date,
        load_score: null,
        suffer_score: sufferScore,
        duration: activity.moving_time || activity.elapsed_time || 0,
        avg_hr: activity.average_heartrate || null,
        max_hr: activity.max_heartrate || null,
      });

      return {
        user_id: targetUserId,
        external_id: activity.id.toString(),
        title: activity.name,
        type: activity.type,
        distance: activity.distance || 0,
        duration: activity.moving_time || activity.elapsed_time || 0,
        start_date: activity.start_date,
        elapsed_time: activity.elapsed_time || 0,
        elevation_gain: activity.total_elevation_gain || 0,
        average_speed: activity.average_speed || 0,
        max_speed: activity.max_speed || 0,
        avg_hr: activity.average_heartrate || null,
        max_hr: activity.max_heartrate || null,
        suffer_score: sufferScore,
        load_score: loadScore,
        is_private: activity.private || false,
        metadata: activity,
        updated_at: new Date().toISOString(),
      };
    });

    for (const batch of chunkArray(upsertRows, 100)) {
      const { error: upsertError } = await serviceSupabase
        .from('activities')
        .upsert(batch, { onConflict: 'user_id,external_id' });

      if (upsertError) throw upsertError;
    }

    await serviceSupabase
      .from('activity_backfill_jobs')
      .update({
        status: 'success',
        activities_processed: upsertRows.length,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  } catch (error) {
    await serviceSupabase
      .from('activity_backfill_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'BACKFILL_FAILED',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/load-metrics', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const { id } = await params;
    const authResult = await requireAuth();

    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { supabase, user } = authResult;
    const targetUserId = id;
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('team_id, coach_id')
      .eq('id', targetUserId)
      .single();

    if (user!.id !== targetUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', user!.id)
        .single();

      if (profile?.role === 'COACH' || profile?.role === 'ADMIN') {
        const { data: athleteProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', targetUserId)
          .single();

        if (!athleteProfile || !profile.team_id || athleteProfile.team_id !== profile.team_id) {
          return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
        }
      } else {
        return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
      }
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user!.id)
      .single();

    let settingsThresholds = normalizeCoachSettings({}).thresholds;

    if (currentProfile?.role === 'COACH' && currentProfile.team_id) {
      const { data: coachSettings } = await supabase
        .from('coach_settings')
        .select('thresholds, default_models')
        .eq('coach_id', user!.id)
        .eq('team_id', currentProfile.team_id)
        .maybeSingle();

      if (coachSettings) {
        settingsThresholds = normalizeCoachSettings({
          thresholds: coachSettings.thresholds,
          default_models: coachSettings.default_models,
        }).thresholds;
      } else {
        const { data: teamSettings } = await supabase
          .from('team_settings')
          .select('thresholds, default_models')
          .eq('team_id', currentProfile.team_id)
          .maybeSingle();

        settingsThresholds = normalizeCoachSettings({
          thresholds: teamSettings?.thresholds,
          default_models: teamSettings?.default_models,
        }).thresholds;
      }
    } else if (currentProfile?.role === 'ADMIN' && currentProfile.team_id) {
      const { data: teamSettings } = await supabase
        .from('team_settings')
        .select('thresholds, default_models')
        .eq('team_id', currentProfile.team_id)
        .maybeSingle();

      settingsThresholds = normalizeCoachSettings({
        thresholds: teamSettings?.thresholds,
        default_models: teamSettings?.default_models,
      }).thresholds;
    } else if (targetProfile?.coach_id && targetProfile.team_id) {
      const { data: coachSettings } = await supabase
        .from('coach_settings')
        .select('thresholds, default_models')
        .eq('coach_id', targetProfile.coach_id)
        .eq('team_id', targetProfile.team_id)
        .maybeSingle();

      settingsThresholds = normalizeCoachSettings({
        thresholds: coachSettings?.thresholds,
        default_models: coachSettings?.default_models,
      }).thresholds;
    }

    const range = parseRange(new URL(request.url).searchParams.get('range'));
    const lookbackDays = range + 42;
    const lookbackStartIso = new Date(Date.now() - (lookbackDays - 1) * 24 * 60 * 60 * 1000).toISOString();
    const serviceSupabase = createServiceRoleClient();

    const [{ data: activities }, { data: athleteProfileRow }, { data: jobs }, { data: oldestActivityRows }] = await Promise.all([
      serviceSupabase
        .from('activities')
        .select('start_date, load_score, suffer_score, duration, avg_hr, max_hr')
        .eq('user_id', targetUserId)
        .gte('start_date', lookbackStartIso)
        .order('start_date', { ascending: true }),
      serviceSupabase
        .from('athlete_profiles')
        .select('lthr, rest_hr, max_hr')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      serviceSupabase
        .from('activity_backfill_jobs')
        .select('id, status, created_at, started_at, finished_at, activities_processed, error, window_days')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1),
      serviceSupabase
        .from('activities')
        .select('start_date')
        .eq('user_id', targetUserId)
        .order('start_date', { ascending: true })
        .limit(1),
    ]);

    const rows = (activities || []) as ActivityLoadRow[];
    const loadData = buildDailyLoadSeries(rows, {
      rangeDays: range,
      profile: {
        lthr: athleteProfileRow?.lthr,
        restHR: athleteProfileRow?.rest_hr,
        maxHR: athleteProfileRow?.max_hr,
      },
    });

    const risk = classifyLoadRisk(loadData.current.acwr, loadData.current.tsb, settingsThresholds);
    const latestJob = jobs?.[0] || null;
    const oldestActivityDate = oldestActivityRows?.[0]?.start_date
      ? startOfDay(new Date(oldestActivityRows[0].start_date))
      : null;
    const historySpanDays = oldestActivityDate
      ? differenceInCalendarDays(startOfDay(new Date()), oldestActivityDate) + 1
      : loadData.historySpanDays;
    const hasEnoughHistory = historySpanDays >= lookbackDays;

    let backfillStatus = latestJob?.status || 'idle';
    const partial = !hasEnoughHistory;

    if (!hasEnoughHistory && (!latestJob || !['queued', 'running'].includes(latestJob.status))) {
      const { data: insertedJob, error: insertError } = await serviceSupabase
        .from('activity_backfill_jobs')
        .insert({
          user_id: targetUserId,
          requested_by: user!.id,
          status: 'queued',
          window_days: 90,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (!insertError && insertedJob?.id) {
        backfillStatus = 'queued';
        queueMicrotask(() => {
          void runBackfillJob(insertedJob.id, targetUserId);
        });
      }
    }

    return respond(
      {
        current: {
          ctl: loadData.current.ctl,
          atl: loadData.current.atl,
          tsb: loadData.current.tsb,
          acwr: loadData.current.acwr,
          todayLoad: loadData.todayLoad,
          avg7d: loadData.avg7d,
          risk,
        },
        series: loadData.series,
        meta: {
          range,
          partial,
          warmupDays: loadData.warmupDays,
          historyDaysAvailable: historySpanDays,
          backfillStatus,
          backfillJob: latestJob,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error('user_load_metrics.unhandled_error', { error });
    Sentry.captureException(error, {
      tags: { route: '/api/v2/users/[id]/load-metrics', requestId },
    });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
