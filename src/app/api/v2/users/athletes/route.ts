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

    // Get all athletes for this coach using direct coach_id relationship
    const { data: athletes, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        created_at,
        athlete_groups(
          id,
          group:groups(
            id,
            name
          )
        )
      `)
      .eq('role', 'ATHLETE')
      .eq('coach_id', user.id);

    if (error) {
      console.error('Failed to fetch athletes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch athletes' },
        { status: 500 }
      );
    }

    // Transform the data to include group information
    const athletesWithGroups = (athletes || []).map(athlete => ({
      id: athlete.id,
      email: athlete.email,
      name: athlete.name,
      role: athlete.role,
      created_at: athlete.created_at,
      groups: athlete.athlete_groups?.map((ag: any) => ag.group).filter(Boolean) || [],
      hasGroups: (athlete.athlete_groups?.length || 0) > 0,
    }));

    return NextResponse.json(athletesWithGroups);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

