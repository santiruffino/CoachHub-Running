import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

/**
 * GET /v2/races
 * 
 * Returns a list of races available to the user.
 * Coaches/admins see races in their team.
 * Athletes see races assigned to them.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED', 'Unauthorized'),
        { status: 401 }
      );
    }

    // Get user profile for role-based filtering
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    // Build query. RLS provides the security layer, but explicit filtering
    // is better for clarity and matches the reference pattern.
    let racesQuery = supabase
      .from('races')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile?.role === 'ADMIN') {
      racesQuery = racesQuery.eq('team_id', profile.team_id);
    } else if (profile?.role === 'COACH') {
      racesQuery = racesQuery.eq('team_id', profile.team_id);
    }
    // Athletes will see races assigned to them via RLS SELECT policy

    const { data: races, error } = await racesQuery;

    if (error) {
      appLogger.error('Fetch races error:', error);
      return NextResponse.json(apiError('FAILED_TO_FETCH_RACES', 'Failed to fetch races'),
        { status: 500 }
      );
    }

    return NextResponse.json(races || []);
  } catch {
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
      { status: 500 }
    );
  }
}

/**
 * POST /v2/races
 * 
 * Creates a new race template.
 * Restricted to coaches and admins.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireRole(['COACH', 'ADMIN']);
    if (authResult.response) {
      return authResult.response;
    }

    const { supabase, user } = authResult;
    
    // Get user profile for team_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('USER_MUST_BELONG_TO_A_TEAM', 'User must belong to a team'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      distance, 
      date,
      elevation_gain, 
      location
    } = body;

    if (!name) {
      return NextResponse.json(apiError('VALIDATION_RACE_NAME_IS_REQUIRED', 'Race name is required'),
        { status: 400 }
      );
    }

    const { data: race, error } = await supabase
      .from('races')
      .insert({
        name,
        description,
        distance,
        date,
        elevation_gain,
        location,
        created_by: user!.id,
        team_id: profile.team_id,
      })
      .select()
      .single();

    if (error) {
      appLogger.error('Create race error:', error);
      return NextResponse.json(apiError('FAILED_TO_CREATE_RACE', 'Failed to create race'),
        { status: 500 }
      );
    }

    if (profile.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: user!.id,
        actorRole: 'ADMIN',
        teamId: profile.team_id,
        action: 'race.created',
        targetType: 'race',
        targetId: race.id,
      });
    }

    return NextResponse.json(race, { status: 201 });
  } catch (error: unknown) {
    appLogger.error('POST /v2/races error:', error);
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
      { status: 500 }
    );
  }
}
