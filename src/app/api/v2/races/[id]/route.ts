import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

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
      .select('team_id')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(
        { error: 'User must belong to a team' },
        { status: 403 }
      );
    }

    const { data: existingRace, error: raceError } = await supabase
      .from('races')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (raceError || !existingRace) {
      return NextResponse.json(
        { error: 'Race not found' },
        { status: 404 }
      );
    }

    if (existingRace.team_id !== profile.team_id) {
      return NextResponse.json(
        { error: 'Not authorized to update this race' },
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
      console.error('Update race error:', error);
      return NextResponse.json(
        { error: 'Failed to update race' },
        { status: 500 }
      );
    }

    return NextResponse.json(race);
  } catch (error: unknown) {
    console.error('PATCH /v2/races/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
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
      .select('team_id')
      .eq('id', user!.id)
      .single();

    if (!profile?.team_id) {
      return NextResponse.json(
        { error: 'User must belong to a team' },
        { status: 403 }
      );
    }

    const { data: existingRace, error: raceError } = await supabase
      .from('races')
      .select('id, team_id')
      .eq('id', id)
      .single();

    if (raceError || !existingRace) {
      return NextResponse.json(
        { error: 'Race not found' },
        { status: 404 }
      );
    }

    if (existingRace.team_id !== profile.team_id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this race' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('races')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete race error:', error);
      return NextResponse.json(
        { error: 'Failed to delete race' },
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    console.error('DELETE /v2/races/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
