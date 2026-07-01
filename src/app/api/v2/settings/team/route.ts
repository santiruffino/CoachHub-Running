import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { normalizeTeamSettings } from '@/lib/settings/defaults';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { createRequestLogger } from '@/lib/logger';
import { reportApiError } from '@/lib/api/report-error';

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/settings/team', request);
  try {
    const authResult = await requireRole(['COACH', 'ADMIN']);
    if (authResult.response) return authResult.response;

    const { supabase, user } = authResult;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
    }

    const { data, error } = await supabase
      .from('team_settings')
      .select('thresholds, branding, default_models, max_athletes')
      .eq('team_id', profile.team_id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to fetch team settings', { error });
      return NextResponse.json(apiError('FAILED_TO_FETCH_TEAM_SETTINGS'), { status: 500 });
    }

    return NextResponse.json(
      normalizeTeamSettings({
        thresholds: data?.thresholds,
        branding: data?.branding,
        default_models: data?.default_models,
        limits: { maxAthletes: data?.max_athletes ?? null },
      })
    );
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/settings/team', method: 'GET', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/settings/team', request);
  try {
    const authResult = await requireRole('ADMIN');
    if (authResult.response) return authResult.response;

    const { supabase, user } = authResult;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
    }

    const body = (await request.json()) as {
      thresholds?: Record<string, unknown> | null;
      branding?: Record<string, unknown> | null;
      defaultModels?: Record<string, unknown> | null;
      limits?: Record<string, unknown> | null;
    };

    const normalized = normalizeTeamSettings({
      thresholds: body?.thresholds,
      branding: body?.branding,
      defaultModels: body?.defaultModels,
      limits: body?.limits,
    });

    const { error } = await supabase
      .from('team_settings')
      .upsert(
        {
          team_id: profile.team_id,
          thresholds: normalized.thresholds,
          branding: normalized.branding,
          default_models: normalized.defaultModels,
          max_athletes: normalized.limits.maxAthletes,
          updated_by: user!.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'team_id' }
      );

    if (error) {
      logger.error('Failed to update team settings', { error });
      return NextResponse.json(apiError('FAILED_TO_UPDATE_TEAM_SETTINGS'), { status: 500 });
    }

    await appendAdminActionLog({
      actorId: user!.id,
      actorRole: 'ADMIN',
      teamId: profile.team_id,
      action: 'team_settings.updated',
      targetType: 'team_settings',
      targetId: profile.team_id,
      metadata: {
        thresholdsUpdated: !!body?.thresholds,
        brandingUpdated: !!body?.branding,
        defaultModelsUpdated: !!body?.defaultModels,
        limitsUpdated: !!body?.limits,
      },
    });

    return NextResponse.json(normalized);
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/settings/team', method: 'PATCH', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
