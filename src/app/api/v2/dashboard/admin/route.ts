import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/api-helpers';

export async function GET() {
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const supabase = await createClient();

  try {
    // Total Athletes
    const { count: athletesCount, error: athletesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'ATHLETE');

    if (athletesError) throw athletesError;

    // Total Coaches
    const { count: coachesCount, error: coachesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'COACH');

    if (coachesError) throw coachesError;

    // Total Groups
    const { count: groupsCount, error: groupsError } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true });

    if (groupsError) throw groupsError;

    // All Coaches with details
    const { data: coachesData, error: coachesDetailsError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'COACH');

    if (coachesDetailsError) throw coachesDetailsError;

    // Fetch last activity for each coach (e.g. from activities table or sync_logs)
    // For MVP, we check the sync_logs or activities to see when they were last active,
    // or we can check the 'updated_at' of their profile / when they last assigned a training.
    // For simplicity, we just look at the latest training assigned by them.
    const coachesWithActivity = await Promise.all((coachesData || []).map(async (coach) => {
      const { data: latestTraining, error: latestTrainingError } = await supabase
        .from('trainings')
        .select('created_at')
        .eq('coach_id', coach.id)
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
  } catch (error: any) {
    console.error('Admin Dashboard Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch admin dashboard data' },
      { status: 500 }
    );
  }
}
