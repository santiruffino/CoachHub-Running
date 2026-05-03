import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

export async function GET() {
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
      return NextResponse.json({ error: 'Admin must belong to a team' }, { status: 403 });
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

    // Fetch last activity for each coach (e.g. from activities table or sync_logs)
    // For MVP, we check the sync_logs or activities to see when they were last active,
    // or we can check the 'updated_at' of their profile / when they last assigned a training.
    // For simplicity, we just look at the latest training assigned by them.
    const coachesWithActivity = await Promise.all((coachesData || []).map(async (coach) => {
      const { data: latestTraining } = await supabase
        .from('trainings')
        .select('created_at')
        .eq('created_by', coach.id)
        .eq('team_id', adminProfile.team_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      return {
        ...coach,
        lastActivity: latestTraining?.created_at || null,
        totalAthletes: 0 // Could query athlete_groups for this coach, omitted for brevity but can be added
      };
    }));

    // Could aggregate total athletes per coach
    for (const coach of coachesWithActivity) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', adminProfile.team_id)
        .eq('coach_id', coach.id);
      coach.totalAthletes = count || 0;
    }

    return NextResponse.json({
      metrics: {
        totalAthletes: athletesCount || 0,
        totalCoaches: coachesCount || 0,
        totalGroups: groupsCount || 0,
      },
      coaches: coachesWithActivity
    });
  } catch (error: unknown) {
    console.error('Admin Dashboard Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch admin dashboard data' },
      { status: 500 }
    );
  }
}
