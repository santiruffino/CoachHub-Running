import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { normalizeCoachSettings } from '@/lib/settings/defaults';
import { createRequestLogger } from '@/lib/logger';
import { reportApiError } from '@/lib/api/report-error';

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/settings/coach', request);
  try {
    const authResult = await requireRole('COACH');
    if (authResult.response) return authResult.response;

    const { supabase, user } = authResult;

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
    }

    const { data, error } = await supabase
      .from('coach_settings')
      .select('thresholds, default_models, preferences')
      .eq('coach_id', user!.id)
      .eq('team_id', profile.team_id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch coach settings', { error });
      return NextResponse.json(apiError('FAILED_TO_FETCH_COACH_SETTINGS'), { status: 500 });
    }

    return NextResponse.json(
      normalizeCoachSettings({
        thresholds: data?.thresholds,
        default_models: data?.default_models,
        preferences: data?.preferences,
      })
    );
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/settings/coach', method: 'GET', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/settings/coach', request);
  try {
    const authResult = await requireRole('COACH');
    if (authResult.response) return authResult.response;

    const { supabase, user } = authResult;

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
    }

    const body = (await request.json()) as {
      thresholds?: Record<string, unknown> | null;
      defaultModels?: Record<string, unknown> | null;
      preferences?: Record<string, unknown> | null;
    };

    const normalized = normalizeCoachSettings({
      thresholds: body?.thresholds,
      defaultModels: body?.defaultModels,
      preferences: body?.preferences,
    });

    const { error } = await supabase
      .from('coach_settings')
      .upsert(
        {
          coach_id: user!.id,
          team_id: profile.team_id,
          thresholds: normalized.thresholds,
          default_models: normalized.defaultModels,
          preferences: normalized.preferences,
          updated_by: user!.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'coach_id' }
      );

    if (error) {
      logger.error('Failed to update coach settings', { error });
      return NextResponse.json(apiError('FAILED_TO_UPDATE_COACH_SETTINGS'), { status: 500 });
    }

    return NextResponse.json(normalized);
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/settings/coach', method: 'PATCH', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
