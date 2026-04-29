import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/api-helpers';

export async function GET() {
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const supabase = await authResult.supabase;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', authResult.user!.id)
      .single();

    let coachesQuery = supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .eq('role', 'COACH');

    if (profile?.team_id) {
      coachesQuery = coachesQuery.eq('team_id', profile.team_id);
    } else {
      coachesQuery = coachesQuery.is('team_id', null);
    }

    const { data: coaches, error: coachesError } = await coachesQuery;

    if (coachesError) throw coachesError;

    // Enhance each coach with the total number of athletes assigned to them
    const enhancedCoaches = await Promise.all(
      (coaches || []).map(async (coach) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coach.id)
          .eq('role', 'ATHLETE');

        return {
          ...coach,
          totalAthletes: count || 0,
        };
      })
    );

    return NextResponse.json(enhancedCoaches);
  } catch (error: any) {
    console.error('Failed to fetch coaches:', error.message);
    return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
  }
}
