import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { ensureCoachStarterTemplates } from '@/lib/onboarding/starter-templates';

export async function GET() {
  const authResult = await requireRole('COACH');
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_onboarding_completed, team_id')
    .eq('id', user!.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(apiError('FAILED_TO_FETCH_ONBOARDING_STATUS', 'Failed to fetch onboarding status'), {
      status: 500,
    });
  }

  return NextResponse.json({
    isCompleted: !!profile.is_onboarding_completed,
    hasTeam: !!profile.team_id,
  });
}

export async function POST(request: Request) {
  const authResult = await requireRole('COACH');
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;
  const body = (await request.json()) as {
    bio?: string;
    specialty?: string;
    experience?: string;
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, team_id')
    .eq('id', user!.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(apiError('FAILED_TO_FETCH_PROFILE', 'Failed to fetch profile'), { status: 500 });
  }

  if (!profile.team_id) {
    return NextResponse.json(apiError('TEAM_REQUIRED', 'Coach must belong to a team'), { status: 403 });
  }

  const { error: coachProfileError } = await supabase
    .from('coach_profiles')
    .upsert(
      {
        user_id: user!.id,
        bio: body.bio || null,
        specialty: body.specialty || null,
        experience: body.experience || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (coachProfileError) {
    return NextResponse.json(apiError('FAILED_TO_UPDATE_COACH_PROFILE', 'Failed to update coach profile'), { status: 500 });
  }

  const { error: onboardingError } = await supabase
    .from('profiles')
    .update({
      is_onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user!.id);

  if (onboardingError) {
    return NextResponse.json(apiError('FAILED_TO_COMPLETE_ONBOARDING', 'Failed to complete onboarding'), { status: 500 });
  }

  await ensureCoachStarterTemplates(user!.id, profile.team_id);

  return NextResponse.json({ success: true, createdStarterTemplates: true });
}
