import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

export async function GET(request: Request) {
  const { requestId, logger } = createRequestLogger('/api/v2/dashboard/admin', request);
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const supabase = authResult.supabase;

  try {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', authResult.user.id)
      .single();

    if (!adminProfile?.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    // Total Athletes
    const { count: athletesCount, error: athletesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'ATHLETE')
      .eq('team_id', adminProfile.team_id);

    if (athletesError) throw athletesError;

    // Total Coaches
    const { count: coachesCount, error: coachesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'COACH')
      .eq('team_id', adminProfile.team_id);

    if (coachesError) throw coachesError;

    // Total Groups
    const { count: groupsCount, error: groupsError } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', adminProfile.team_id);

    if (groupsError) throw groupsError;

    // All Coaches with details
    const { data: coachesData, error: coachesDetailsError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'COACH')
      .eq('team_id', adminProfile.team_id);

    if (coachesDetailsError) throw coachesDetailsError;

    const coachIds = (coachesData || []).map((coach) => coach.id);

    // Latest training per coach — fetch all of this team's trainings created by
    // these coaches in a single query (ordered newest-first) and keep the first
    // row seen per coach, instead of one query per coach.
    const { data: coachTrainings } = coachIds.length > 0
      ? await supabase
          .from('trainings')
          .select('created_by, created_at')
          .in('created_by', coachIds)
          .eq('team_id', adminProfile.team_id)
          .order('created_at', { ascending: false })
      : { data: [] as { created_by: string; created_at: string }[] };

    const lastActivityByCoachId = new Map<string, string>();
    for (const training of (coachTrainings || [])) {
      if (!lastActivityByCoachId.has(training.created_by)) {
        lastActivityByCoachId.set(training.created_by, training.created_at);
      }
    }

    // Total athletes per coach — fetch all of the team's athletes in one query
    // and tally by coach_id, instead of a COUNT query per coach.
    const { data: teamAthletes } = await supabase
      .from('profiles')
      .select('coach_id')
      .eq('role', 'ATHLETE')
      .eq('team_id', adminProfile.team_id);

    const athleteCountByCoachId = new Map<string, number>();
    for (const athlete of (teamAthletes || [])) {
      if (!athlete.coach_id) continue;
      athleteCountByCoachId.set(athlete.coach_id, (athleteCountByCoachId.get(athlete.coach_id) || 0) + 1);
    }

    const coachesWithActivity = (coachesData || []).map((coach) => ({
      ...coach,
      lastActivity: lastActivityByCoachId.get(coach.id) || null,
      totalAthletes: athleteCountByCoachId.get(coach.id) || 0,
    }));

    return NextResponse.json({
      metrics: {
        totalAthletes: athletesCount || 0,
        totalCoaches: coachesCount || 0,
        totalGroups: groupsCount || 0,
      },
      coaches: coachesWithActivity
    });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/dashboard/admin', method: 'GET', requestId, logger });
    return NextResponse.json(apiError('FAILED_TO_FETCH_ADMIN_DASHBOARD_DATA'),
      { status: 500 }
    );
  }
}
