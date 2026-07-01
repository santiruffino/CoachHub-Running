import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CareerStatsTotals {
  count: number;
  distance: number;
  elevationGain: number;
  movingTime: number;
}

export interface CareerStats {
  ytd: CareerStatsTotals;
  allTime: CareerStatsTotals;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/career-stats', request);
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
    const { data: profileRow } = await serviceSupabase
      .from('profiles')
      .select('career_stats, career_stats_synced_at')
      .eq('id', targetUserId)
      .maybeSingle();

    const syncedAt = profileRow?.career_stats_synced_at ? new Date(profileRow.career_stats_synced_at) : null;
    const isFresh = syncedAt ? Date.now() - syncedAt.getTime() < CACHE_TTL_MS : false;

    if (profileRow?.career_stats && isFresh) {
      return respond(
        { careerStats: profileRow.career_stats as CareerStats, syncedAt: profileRow.career_stats_synced_at },
        { status: 200 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('career_stats.missing_supabase_env');
      return respond(apiError('SERVER_CONFIGURATION_ERROR'), { status: 500 });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return respond(apiError('AUTH_UNAUTHORIZED'), { status: 401 });
    }

    const functionUrl = `${supabaseUrl}/functions/v1/sync-athlete-stats?uuid=${encodeURIComponent(targetUserId)}`;
    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
    });

    if (!response.ok) {
      logger.warn('career_stats.edge_function_error', { targetUserId, status: response.status });

      // Fall back to stale cache rather than failing outright.
      if (profileRow?.career_stats) {
        return respond(
          { careerStats: profileRow.career_stats as CareerStats, syncedAt: profileRow.career_stats_synced_at, stale: true },
          { status: 200 }
        );
      }

      return respond(apiError('FAILED_TO_LOAD_CAREER_STATS'), { status: response.status });
    }

    const data = await response.json();
    return respond(data, { status: 200 });
  } catch (error: unknown) {
    logger.error('career_stats.unhandled_error', { error });
    Sentry.captureException(error, {
      tags: { route: '/api/v2/users/[id]/career-stats', requestId },
    });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
