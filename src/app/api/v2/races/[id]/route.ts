import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { reportApiError } from '@/lib/api/report-error';

/**
 * PATCH /v2/races/[id]
 * 
 * Updates a race template.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/races/[id]', request);
  try {
    const { id } = await params;
    const authResult = await requireRole(['COACH', 'ADMIN']);
    if (authResult.response) {
      return authResult.response;
    }

    const { supabase, user } = authResult;
    const body = await request.json();
    const { name, description, distance, date, elevation_gain, location } = body;

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'),
        { status: 403 }
      );
    }

    const { data: existingRace, error: raceError } = await supabase
      .from('races')
      .select('id, coach_id')
      .eq('id', id)
      .single();

    if (raceError || !existingRace) {
      return NextResponse.json(apiError('RACE_NOT_FOUND'),
        { status: 404 }
      );
    }

    const { data: teamMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', profile.team_id);
      
    const teamMemberIds = teamMembers?.map(m => m.id) || [user.id];

    if (!existingRace.coach_id || !teamMemberIds.includes(existingRace.coach_id)) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'),
        { status: 403 }
      );
    }

    const { data: race, error } = await supabase
      .from('races')
      .update({
        name,
        description,
        distance,
        elevation_gain,
        location,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Update race error', { error: error });
      return NextResponse.json(apiError('FAILED_TO_UPDATE_RACE'),
        { status: 500 }
      );
    }

    if (profile.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: user!.id,
        actorRole: 'ADMIN',
        teamId: profile.team_id,
        action: 'race.updated',
        targetType: 'race',
        targetId: id,
      });
    }

    return NextResponse.json(race);
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/races/[id]', method: 'PATCH', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * DELETE /v2/races/[id]
 * 
 * Deletes a race template.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/races/[id]', request);
  try {
    const { id } = await params;
    const authResult = await requireRole(['COACH', 'ADMIN']);
    if (authResult.response) {
      return authResult.response;
    }

    const { supabase, user } = authResult;

    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, role')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'),
        { status: 403 }
      );
    }

    const { data: existingRace, error: raceError } = await supabase
      .from('races')
      .select('id, coach_id')
      .eq('id', id)
      .single();

    if (raceError || !existingRace) {
      return NextResponse.json(apiError('RACE_NOT_FOUND'),
        { status: 404 }
      );
    }

    const { data: teamMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', profile.team_id);
      
    const teamMemberIds = teamMembers?.map(m => m.id) || [user.id];

    if (!existingRace.coach_id || !teamMemberIds.includes(existingRace.coach_id)) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'),
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('races')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Delete race error', { error: error });
      return NextResponse.json(apiError('FAILED_TO_DELETE_RACE'),
        { status: 500 }
      );
    }

    if (profile.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: user!.id,
        actorRole: 'ADMIN',
        teamId: profile.team_id,
        action: 'race.deleted',
        targetType: 'race',
        targetId: id,
      });
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/races/[id]', method: 'DELETE', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
      { status: 500 }
    );
  }
}
