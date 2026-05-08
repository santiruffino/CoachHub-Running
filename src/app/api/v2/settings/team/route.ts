import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { normalizeTeamSettings } from '@/lib/settings/defaults';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

export async function GET() {
  const authResult = await requireRole(['COACH', 'ADMIN']);
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user!.id)
    .single();

  if (!profile?.team_id) {
    return NextResponse.json(apiError('TEAM_REQUIRED', 'User must belong to a team'), { status: 403 });
  }

  const { data, error } = await supabase
    .from('team_settings')
    .select('thresholds, branding, default_models')
    .eq('team_id', profile.team_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(apiError('FAILED_TO_FETCH_TEAM_SETTINGS', 'Failed to fetch team settings'), { status: 500 });
  }

  return NextResponse.json(
    normalizeTeamSettings({
      thresholds: data?.thresholds,
      branding: data?.branding,
      default_models: data?.default_models,
    })
  );
}

export async function PATCH(request: Request) {
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user!.id)
    .single();

  if (!profile?.team_id) {
    return NextResponse.json(apiError('TEAM_REQUIRED', 'Admin must belong to a team'), { status: 403 });
  }

  const body = (await request.json()) as {
    thresholds?: Record<string, unknown> | null;
    branding?: Record<string, unknown> | null;
    defaultModels?: Record<string, unknown> | null;
  };

  const normalized = normalizeTeamSettings({
    thresholds: body?.thresholds,
    branding: body?.branding,
    defaultModels: body?.defaultModels,
  });

  const { error } = await supabase
    .from('team_settings')
    .upsert(
      {
        team_id: profile.team_id,
        thresholds: normalized.thresholds,
        branding: normalized.branding,
        default_models: normalized.defaultModels,
        updated_by: user!.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id' }
    );

  if (error) {
    return NextResponse.json(apiError('FAILED_TO_UPDATE_TEAM_SETTINGS', 'Failed to update team settings'), { status: 500 });
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
    },
  });

  return NextResponse.json(normalized);
}
