import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { ActivityLoadRow, buildDailyLoadSeries, classifyLoadRisk } from '@/lib/training/load';
import { normalizeCoachSettings } from '@/lib/settings/defaults';
import { enqueueStravaBackfillJob } from '@/lib/strava/backfill-jobs';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

type RangeDays = 7 | 30 | 90;

function parseRange(raw: string | null): RangeDays {
  if (raw === '7') return 7;
  if (raw === '90') return 90;
  return 30;
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
      // The /api/cron/strava-backfill worker claims and processes this job
      // on its next tick — no work runs inline within this GET request.
      const { queued } = await enqueueStravaBackfillJob(serviceSupabase, {
        userId: targetUserId,
        requestedBy: user!.id,
        windowDays: 90,
      });

      if (queued) {
        backfillStatus = 'queued';
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
