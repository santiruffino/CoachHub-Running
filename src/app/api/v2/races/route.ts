import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { reportApiError } from '@/lib/api/report-error';

/**
 * GET /v2/races
 * 
 * Returns a list of races available to the user.
 * Coaches/admins see races in their team.
 * Athletes see races assigned to them.
 */
export async function GET(request: Request) {
  const { requestId, logger } = createRequestLogger('/api/v2/races', request);
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED'),
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

    if (profile?.role === 'ADMIN' || profile?.role === 'COACH') {
      // Get all coaches in the same team
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('team_id', profile.team_id);
        
      const teamMemberIds = teamMembers?.map(m => m.id) || [user.id];
      racesQuery = racesQuery.in('coach_id', teamMemberIds);
    }
    // Athletes will see races assigned to them via RLS SELECT policy

    const { data: races, error } = await racesQuery;

    if (error) {
      logger.error('Fetch races error', { error: error });
      return NextResponse.json(apiError('FAILED_TO_FETCH_RACES'),
        { status: 500 }
      );
    }

    return NextResponse.json(races || []);
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/races', method: 'GET', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
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
  const { requestId, logger } = createRequestLogger('/api/v2/races', request);
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
      return NextResponse.json(apiError('USER_MUST_BELONG_TO_A_TEAM'),
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
      return NextResponse.json(apiError('VALIDATION_RACE_NAME_IS_REQUIRED'),
        { status: 400 }
      );
    }

    const { data: race, error } = await supabase
      .from('races')
      .insert({
        name,
        description: description || null,
        distance: distance || null,
        elevation_gain: elevation_gain ?? null,
        location: location || null,
        coach_id: user!.id,
        team_id: null, // Workaround for DB migration bug where team_id references groups(id)
      })
      .select()
      .single();

    if (error) {
      logger.error('Create race error', { error: { message: error.message, code: error.code, details: error.details, hint: error.hint } });
      return NextResponse.json(apiError('FAILED_TO_CREATE_RACE'),
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
    reportApiError(error, { route: '/api/v2/races', method: 'POST', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
      { status: 500 }
    );
  }
}
