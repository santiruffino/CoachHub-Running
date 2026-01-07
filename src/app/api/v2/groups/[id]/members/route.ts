import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Add Member to Group
 * 
 * Adds an athlete to a group.
 * 
 * Access: COACH only (must own the group)
 */
export async function POST(
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
        const { athleteId } = await request.json();

        if (!athleteId) {
            return NextResponse.json(
                { error: 'athleteId is required' },
                { status: 400 }
            );
        }

        // Verify group exists and coach owns it
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('coach_id')
            .eq('id', groupId)
            .single();

        if (groupError || !group) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            );
        }

        if (group.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to modify this group' },
                { status: 403 }
            );
        }

        // Verify athlete exists and is an athlete
        const { data: athlete, error: athleteError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', athleteId)
            .single();

        if (athleteError || !athlete) {
            return NextResponse.json(
                { error: 'Athlete not found' },
                { status: 404 }
            );
        }

        if (athlete.role !== 'ATHLETE') {
            return NextResponse.json(
                { error: 'User is not an athlete' },
                { status: 400 }
            );
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from('athlete_groups')
            .select('id')
            .eq('group_id', groupId)
            .eq('athlete_id', athleteId)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: 'Athlete is already a member of this group' },
                { status: 409 }
            );
        }

        // Add athlete to group
        const { data: membership, error: insertError } = await supabase
            .from('athlete_groups')
            .insert({
                group_id: groupId,
                athlete_id: athleteId,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Add member error:', insertError);
            return NextResponse.json(
                { error: 'Failed to add member to group' },
                { status: 500 }
            );
        }

        return NextResponse.json(membership, { status: 201 });
    } catch (error: any) {
        console.error('Add member error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Remove Member from Group
 * 
 * Removes an athlete from a group.
 * Uses athleteId from request body.
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
        const { athleteId } = await request.json();

        if (!athleteId) {
            return NextResponse.json(
                { error: 'athleteId is required' },
                { status: 400 }
            );
        }

        // Verify group exists and coach owns it
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('coach_id')
            .eq('id', groupId)
            .single();

        if (groupError || !group) {
            return NextResponse.json(
                { error: 'Group not found' },
                { status: 404 }
            );
        }

        if (group.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to modify this group' },
                { status: 403 }
            );
        }

        // Remove athlete from group
        const { error: deleteError } = await supabase
            .from('athlete_groups')
            .delete()
            .eq('group_id', groupId)
            .eq('athlete_id', athleteId);

        if (deleteError) {
            console.error('Remove member error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to remove member from group' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Member removed successfully',
        });
    } catch (error: any) {
        console.error('Remove member error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
