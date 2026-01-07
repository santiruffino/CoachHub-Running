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
        const groupId = id;

        // Fetch group with members
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select(`
        id,
        name,
        description,
        coach_id,
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

        // Verify coach owns this group
        if (group.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to view this group' },
                { status: 403 }
            );
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
        const groupId = id;

        // Verify group exists and coach owns it
        const { data: group, error: fetchError } = await supabase
            .from('groups')
            .select('coach_id')
            .eq('id', groupId)
            .single();

        if (fetchError || !group) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            );
        }

        if (group.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to delete this group' },
                { status: 403 }
            );
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
