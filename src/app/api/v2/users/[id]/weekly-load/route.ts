import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { buildWeeklyLoadSeries, WeeklyLoadRow } from '@/lib/training/weekly-load';

const WEEKS = 8;
const CACHE_TTL_SECONDS = 1800;

const getCachedWeeklyLoad = unstable_cache(
  async (targetUserId: string, lthr?: number | null, restHr?: number | null, maxHr?: number | null) => {
    const serviceSupabase = createServiceRoleClient();
    const lookbackStartIso = new Date(Date.now() - (WEEKS * 7) * 24 * 60 * 60 * 1000).toISOString();

    const { data: activities } = await serviceSupabase
      .from('activities')
      .select('start_date, distance, duration, load_score, suffer_score, avg_hr, max_hr')
      .eq('user_id', targetUserId)
      .gte('start_date', lookbackStartIso)
      .order('start_date', { ascending: true });

    const rows = (activities || []) as WeeklyLoadRow[];

    return buildWeeklyLoadSeries(rows, {
      weeks: WEEKS,
      profile: { lthr, restHR: restHr, maxHR: maxHr },
    });
  },
  ['weekly-load'],
  { revalidate: CACHE_TTL_SECONDS }
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/weekly-load', request);
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

    const serviceSupabase = createServiceRoleClient();
    const { data: athleteProfileRow } = await serviceSupabase
      .from('athlete_profiles')
      .select('lthr, rest_hr, max_hr')
      .eq('user_id', targetUserId)
      .maybeSingle();

    const series = await getCachedWeeklyLoad(
      targetUserId,
      athleteProfileRow?.lthr,
      athleteProfileRow?.rest_hr,
      athleteProfileRow?.max_hr
    );

    return respond({ series, meta: { weeks: WEEKS } }, { status: 200 });
  } catch (error: unknown) {
    logger.error('user_weekly_load.unhandled_error', { error });
    Sentry.captureException(error, {
      tags: { route: '/api/v2/users/[id]/weekly-load', requestId },
    });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
