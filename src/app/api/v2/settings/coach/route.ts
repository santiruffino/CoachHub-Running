import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { normalizeCoachSettings } from '@/lib/settings/defaults';

export async function GET() {
  const authResult = await requireRole('COACH');
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single();

  if (!profile?.team_id) {
    return NextResponse.json(apiError('TEAM_REQUIRED', 'Coach must belong to a team'), { status: 403 });
  }

  const { data, error } = await supabase
    .from('coach_settings')
    .select('thresholds, default_models')
    .eq('coach_id', user!.id)
    .eq('team_id', profile.team_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(apiError('FAILED_TO_FETCH_COACH_SETTINGS', 'Failed to fetch coach settings'), { status: 500 });
  }

  return NextResponse.json(
    normalizeCoachSettings({
      thresholds: data?.thresholds,
      default_models: data?.default_models,
    })
  );
}

export async function PATCH(request: Request) {
  const authResult = await requireRole('COACH');
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single();

  if (!profile?.team_id) {
    return NextResponse.json(apiError('TEAM_REQUIRED', 'Coach must belong to a team'), { status: 403 });
  }

  const body = (await request.json()) as {
    thresholds?: Record<string, unknown> | null;
    defaultModels?: Record<string, unknown> | null;
  };

  const normalized = normalizeCoachSettings({
    thresholds: body?.thresholds,
    defaultModels: body?.defaultModels,
  });

  const { error } = await supabase
    .from('coach_settings')
    .upsert(
      {
        coach_id: user!.id,
        team_id: profile.team_id,
        thresholds: normalized.thresholds,
        default_models: normalized.defaultModels,
        updated_by: user!.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coach_id' }
    );

  if (error) {
    return NextResponse.json(apiError('FAILED_TO_UPDATE_COACH_SETTINGS', 'Failed to update coach settings'), { status: 500 });
  }

  return NextResponse.json(normalized);
}
