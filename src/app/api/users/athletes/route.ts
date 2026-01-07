import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a coach
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'COACH') {
      return NextResponse.json(
        { error: 'Only coaches can access this endpoint' },
        { status: 403 }
      );
    }

    // Get all athletes in coach's groups
    const { data: athletes, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        created_at,
        athlete_groups!inner(
          group:groups!inner(
            coach_id
          )
        )
      `)
      .eq('role', 'ATHLETE')
      .eq('athlete_groups.group.coach_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch athletes' },
        { status: 500 }
      );
    }

    // Deduplicate athletes (they might be in multiple groups)
    const uniqueAthletes = Array.from(
      new Map(athletes.map(a => [a.id, a])).values()
    );

    return NextResponse.json(uniqueAthletes);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

