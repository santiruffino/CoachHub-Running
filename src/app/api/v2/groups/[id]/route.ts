import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Get Group Details
 * 
 * Fetches detailed information about a specific group including:
 * - Group info
 * - Members list
 * - Member count
 * 
 * Access: COACH only (must own the group)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const groupId = id;

        // Fetch group with members
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select(`
        id,
        name,
        description,
        team_id,
        created_at,
        updated_at,
        members:athlete_groups(
          id,
          joined_at,
          athlete:profiles!athlete_groups_athlete_id_fkey(
            id,
            name,
            email,
            athlete_profile:athlete_profiles(
              id,
              dob,
              rest_hr,
              max_hr
            )
          )
        )
      `)
            .eq('id', groupId)
            .single();

        if (groupError || !group) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            );
        }

        // Verify access rights (Both ADMIN and COACH can access if in the same team)
        if ((profile.role === 'ADMIN' || profile.role === 'COACH') && group.team_id !== profile.team_id) {
            return NextResponse.json({ error: 'Not authorized to view this group' }, { status: 403 });
        }

        return NextResponse.json(group);
    } catch (error: any) {
        console.error('Get group details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Delete Group
 * 
 * Deletes a group and all its member associations.
 * 
 * Access: COACH only (must own the group)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const groupId = id;

        // Verify group exists and coach owns it
        const { data: group, error: fetchError } = await supabase
            .from('groups')
            .select('team_id')
            .eq('id', groupId)
            .single();

        if (fetchError || !group) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            );
        }

        // Verify access rights (Both ADMIN and COACH can access if in the same team)
        if ((profile.role === 'ADMIN' || profile.role === 'COACH') && group.team_id !== profile.team_id) {
            return NextResponse.json({ error: 'Not authorized to delete this group' }, { status: 403 });
        }

        // Delete group (cascade will delete athlete_groups entries)
        const { error: deleteError } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (deleteError) {
            console.error('Delete group error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete group' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Group deleted successfully'
        });
    } catch (error: any) {
        console.error('Delete group error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Update Group
 * 
 * Access: COACH or ADMIN
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const groupId = id;

        // Verify group exists
        const { data: group, error: fetchError } = await supabase
            .from('groups')
            .select('team_id')
            .eq('id', groupId)
            .single();

        if (fetchError || !group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Verify access rights (Both ADMIN and COACH can access if in the same team)
        if ((profile.role === 'ADMIN' || profile.role === 'COACH') && group.team_id !== profile.team_id) {
            return NextResponse.json({ error: 'Not authorized to edit this group' }, { status: 403 });
        }

        const body = await request.json();
        const updateData: any = {};
        
        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.group_type !== undefined) updateData.group_type = body.group_type;
        if (body.race_date !== undefined) updateData.race_date = body.race_date;
        if (body.race_distance !== undefined) updateData.race_distance = body.race_distance;
        if (body.race_priority !== undefined) updateData.race_priority = body.race_priority;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No data to update' }, { status: 400 });
        }

        const { data: updatedGroup, error: updateError } = await supabase
            .from('groups')
            .update(updateData)
            .eq('id', groupId)
            .select()
            .single();

        if (updateError) {
            console.error('Update group error:', updateError);
            return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
        }

        return NextResponse.json(updatedGroup);
    } catch (error: any) {
        console.error('Update group error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
