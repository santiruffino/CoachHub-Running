import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { ensureCoachStarterTemplates } from '@/lib/onboarding/starter-templates';
import { createRequestLogger } from '@/lib/logger';
import { reportApiError } from '@/lib/api/report-error';

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/onboarding/coach', request);
  try {
    const authResult = await requireRole('COACH');
    if (authResult.response) return authResult.response;

    const { supabase, user } = authResult;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_onboarding_completed, team_id')
      .eq('id', user!.id)
      .single();

    if (error || !profile) {
      logger.error('Failed to fetch onboarding status', { error });
      return NextResponse.json(apiError('FAILED_TO_FETCH_ONBOARDING_STATUS'), {
        status: 500,
      });
    }

    return NextResponse.json({
      isCompleted: !!profile.is_onboarding_completed,
      hasTeam: !!profile.team_id,
    });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/onboarding/coach', method: 'GET', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/onboarding/coach', request);
  try {
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
      logger.error('Failed to fetch profile for onboarding', { error: profileError });
      return NextResponse.json(apiError('FAILED_TO_FETCH_PROFILE'), { status: 500 });
    }

    if (!profile.team_id) {
      return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
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
      logger.error('Failed to update coach profile', { error: coachProfileError });
      return NextResponse.json(apiError('FAILED_TO_UPDATE_COACH_PROFILE'), { status: 500 });
    }

    const { error: onboardingError } = await supabase
      .from('profiles')
      .update({
        is_onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user!.id);

    if (onboardingError) {
      logger.error('Failed to complete onboarding', { error: onboardingError });
      return NextResponse.json(apiError('FAILED_TO_COMPLETE_ONBOARDING'), { status: 500 });
    }

    await ensureCoachStarterTemplates(user!.id, profile.team_id);

    return NextResponse.json({ success: true, createdStarterTemplates: true });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/onboarding/coach', method: 'POST', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
