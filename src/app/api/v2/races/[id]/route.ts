import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

/**
 * PATCH /v2/races/[id]
 * 
 * Updates a race template.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'User must belong to a team'),
        { status: 403 }
      );
    }

    const { data: existingRace, error: raceError } = await supabase
      .from('races')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (raceError || !existingRace) {
      return NextResponse.json(apiError('RACE_NOT_FOUND', 'Race not found'),
        { status: 404 }
      );
    }

    if (existingRace.team_id !== profile.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Not authorized to update this race'),
        { status: 403 }
      );
    }

    const { data: race, error } = await supabase
      .from('races')
      .update({
        name,
        description,
        distance,
        date,
        elevation_gain,
        location,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      appLogger.error('Update race error:', error);
      return NextResponse.json(apiError('FAILED_TO_UPDATE_RACE', 'Failed to update race'),
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
    appLogger.error('PATCH /v2/races/[id] error:', error);
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
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
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'User must belong to a team'),
        { status: 403 }
      );
    }

    const { data: existingRace, error: raceError } = await supabase
      .from('races')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (raceError || !existingRace) {
      return NextResponse.json(apiError('RACE_NOT_FOUND', 'Race not found'),
        { status: 404 }
      );
    }

    if (existingRace.team_id !== profile.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Not authorized to delete this race'),
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('races')
      .delete()
      .eq('id', id);

    if (error) {
      appLogger.error('Delete race error:', error);
      return NextResponse.json(apiError('FAILED_TO_DELETE_RACE', 'Failed to delete race'),
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
    appLogger.error('DELETE /v2/races/[id] error:', error);
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
      { status: 500 }
    );
  }
}
