import { createClient } from '@/lib/supabase/server';
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
    const { name, description, distance, date, elevation_gain, location, team_id } = body;

    const { data: race, error } = await supabase
      .from('races')
      .update({
        name,
        description,
        distance,
        date,
        elevation_gain,
        location,
        team_id: team_id === undefined ? undefined : (team_id || null),
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
  } catch (error: any) {
    console.error('PATCH /v2/races/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

    const { supabase } = authResult;

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
  } catch (error: any) {
    console.error('DELETE /v2/races/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
