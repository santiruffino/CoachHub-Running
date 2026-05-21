import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

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
        void request;
        const { id } = await params;
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
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
            return NextResponse.json(apiError('GROUP_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Verify access rights (Both ADMIN and COACH can access if in the same team)
        if (group.team_id !== profile!.team_id) {
            return NextResponse.json(apiError('AUTH_VIEW_GROUP_FORBIDDEN'), { status: 403 });
        }

        return NextResponse.json(group);
    } catch (error: unknown) {
        appLogger.error('Get group details error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
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
        void request;
        const { id } = await params;
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        const groupId = id;

        // Verify group exists and coach owns it
        const { data: group, error: fetchError } = await supabase
            .from('groups')
            .select('team_id')
            .eq('id', groupId)
            .single();

        if (fetchError || !group) {
            return NextResponse.json(apiError('GROUP_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Verify access rights (Both ADMIN and COACH can access if in the same team)
        if (group.team_id !== profile!.team_id) {
            return NextResponse.json(apiError('AUTH_DELETE_GROUP_FORBIDDEN'), { status: 403 });
        }

        // Delete group (cascade will delete athlete_groups entries)
        const { error: deleteError } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (deleteError) {
            appLogger.error('Delete group error:', deleteError);
            return NextResponse.json(apiError('FAILED_TO_DELETE_GROUP'),
                { status: 500 }
            );
        }

        if (profile!.role === 'ADMIN') {
            await appendAdminActionLog({
                actorId: user!.id,
                actorRole: 'ADMIN',
                teamId: profile!.team_id!,
                action: 'group.deleted',
                targetType: 'group',
                targetId: groupId,
            });
        }

        return NextResponse.json({
            message: 'Group deleted successfully'
        });
    } catch (error: unknown) {
        appLogger.error('Delete group error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
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
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        const groupId = id;

        // Verify group exists
        const { data: group, error: fetchError } = await supabase
            .from('groups')
            .select('team_id')
            .eq('id', groupId)
            .single();

        if (fetchError || !group) {
            return NextResponse.json(apiError('GROUP_NOT_FOUND'), { status: 404 });
        }

        // Verify access rights (Both ADMIN and COACH can access if in the same team)
        if (group.team_id !== profile!.team_id) {
            return NextResponse.json(apiError('AUTH_EDIT_GROUP_FORBIDDEN'), { status: 403 });
        }

        const body = (await request.json()) as {
            name?: string;
            description?: string;
            group_type?: string;
            race_date?: string;
            race_distance?: number;
            race_priority?: string;
        };
        const updateData: Record<string, string | number> = {};
        
        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.group_type !== undefined) updateData.group_type = body.group_type;
        if (body.race_date !== undefined) updateData.race_date = body.race_date;
        if (body.race_distance !== undefined) updateData.race_distance = body.race_distance;
        if (body.race_priority !== undefined) updateData.race_priority = body.race_priority;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(apiError('VALIDATION_NO_DATA_TO_UPDATE'), { status: 400 });
        }

        const { data: updatedGroup, error: updateError } = await supabase
            .from('groups')
            .update(updateData)
            .eq('id', groupId)
            .select()
            .single();

        if (updateError) {
            appLogger.error('Update group error:', updateError);
            return NextResponse.json(apiError('FAILED_TO_UPDATE_GROUP'), { status: 500 });
        }

        if (profile.role === 'ADMIN') {
            await appendAdminActionLog({
                actorId: user!.id,
                actorRole: 'ADMIN',
                teamId: profile.team_id,
                action: 'group.updated',
                targetType: 'group',
                targetId: groupId,
                metadata: {
                    fields: Object.keys(updateData),
                },
            });
        }

        return NextResponse.json(updatedGroup);
    } catch (error: unknown) {
        appLogger.error('Update group error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
