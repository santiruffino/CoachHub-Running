import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';

/**
 * Add Member to Group
 * 
 * Adds an athlete to a group.
 * 
 * Access: COACH only (must belong to group's team)
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
        const { athleteId } = (await request.json()) as { athleteId?: string };

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Coach must belong to a team'),
                { status: 403 }
            );
        }

        if (!athleteId) {
            return NextResponse.json(apiError('VALIDATION_ATHLETEID_IS_REQUIRED', 'athleteId is required'),
                { status: 400 }
            );
        }

        // Verify group exists and belongs to coach team
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('team_id')
            .eq('id', groupId)
            .single();

        if (groupError || !group) {
            return NextResponse.json(apiError('GROUP_NOT_FOUND', 'Group not found'),
                { status: 404 }
            );
        }

        if (group.team_id !== profile.team_id) {
            return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Not authorized to modify this group'),
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
            return NextResponse.json(apiError('ATHLETE_NOT_FOUND', 'Athlete not found'),
                { status: 404 }
            );
        }

        if (athlete.role !== 'ATHLETE') {
            return NextResponse.json(apiError('VALIDATION_USER_IS_NOT_AN_ATHLETE', 'User is not an athlete'),
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
            return NextResponse.json(apiError('ATHLETE_IS_ALREADY_A_MEMBER_OF_THIS_GROUP', 'Athlete is already a member of this group'),
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
            appLogger.error('Add member error:', insertError);
            return NextResponse.json(apiError('FAILED_TO_ADD_MEMBER_TO_GROUP', 'Failed to add member to group'),
                { status: 500 }
            );
        }

        return NextResponse.json(membership, { status: 201 });
    } catch (error: unknown) {
        appLogger.error('Add member error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
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
 * Access: COACH only (must belong to group's team)
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
        const { athleteId } = (await request.json()) as { athleteId?: string };

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Coach must belong to a team'),
                { status: 403 }
            );
        }

        if (!athleteId) {
            return NextResponse.json(apiError('VALIDATION_ATHLETEID_IS_REQUIRED', 'athleteId is required'),
                { status: 400 }
            );
        }

        // Verify group exists and belongs to coach team
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('team_id')
            .eq('id', groupId)
            .single();

        if (groupError || !group) {
            return NextResponse.json(apiError('GROUP_NOT_FOUND', 'Group not found'),
                { status: 404 }
            );
        }

        if (group.team_id !== profile.team_id) {
            return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Not authorized to modify this group'),
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
            appLogger.error('Remove member error:', deleteError);
            return NextResponse.json(apiError('FAILED_TO_REMOVE_MEMBER_FROM_GROUP', 'Failed to remove member from group'),
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Member removed successfully',
        });
    } catch (error: unknown) {
        appLogger.error('Remove member error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
            { status: 500 }
        );
    }
}
