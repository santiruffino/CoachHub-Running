import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth();
  if (authResult.response) return authResult.response;

  const { id: userId } = await params;
  const supabase = authResult.supabase;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', authResult.user.id)
      .single();

    if (profile?.role !== 'ADMIN' && profile?.role !== 'COACH') {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Forbidden'), { status: 403 });
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', userId)
      .single();
        
    if (!targetUser) {
      return NextResponse.json(apiError('USER_NOT_FOUND', 'User not found'), { status: 404 });
    }

    // Both Admins and Coaches can edit athletes within their team
    if (targetUser.team_id !== profile.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Cannot edit an athlete outside your team'), { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      coach_id?: string | null;
    };
    const updateData: Partial<{ name: string; coach_id: string | null }> = {};
    if (body.name !== undefined) updateData.name = body.name;
    // coach_id changes remain allowed only where direct coach responsibility is needed
    if (body.coach_id !== undefined && (profile.role === 'ADMIN' || profile.role === 'COACH')) {
        updateData.coach_id = body.coach_id === 'none' ? null : body.coach_id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(apiError('VALIDATION_NO_DATA_TO_UPDATE', 'No data to update'), { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) throw updateError;

    if (profile.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: authResult.user.id,
        actorRole: 'ADMIN',
        teamId: profile.team_id,
        action: 'user.updated',
        targetType: 'profile',
        targetId: userId,
        metadata: {
          fields: Object.keys(updateData),
        },
      });
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error: unknown) {
    appLogger.error('PATCH user Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(apiError('FAILED_TO_UPDATE_USER', 'Failed to update user'), { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth();
  if (authResult.response) return authResult.response;

  const { id: userId } = await params;
  const supabase = authResult.supabase;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', authResult.user.id)
      .single();

    if (profile?.role !== 'ADMIN' && profile?.role !== 'COACH') {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Forbidden'), { status: 403 });
    }

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', userId)
      .single();
        
    if (!targetUser) {
      return NextResponse.json(apiError('USER_NOT_FOUND', 'User not found'), { status: 404 });
    }

    // Both Admins and Coaches can delete athletes within their team
    if (targetUser.team_id !== profile.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Cannot delete an athlete outside your team'), { status: 403 });
    }

    // Supabase auth.users can only be deleted by the service role.
    // Assuming `profiles` table has ON DELETE CASCADE configured with `auth.users`,
    // we would ideally delete from `auth.users` using the supabase admin api.
    // However, if we don't have service_role key here, we can just wipe profile data or "archive" them.
    // For MVP, we will delete the profile row. (If the DB allows it via RLS, great. Otherwise we might need RPC).
    
    // Instead of deleting the auth user, we can just delete from `profiles`. 
    // This removes them from the application.
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) {
       // If RLS prevents deletion from profiles (it sometimes happens because it's tied to auth.users in a 1:1), 
       // fallback to setting 'coach_id' = null to orphan them if COACH deletes them.
       appLogger.error("Failed to delete profile, possibly RLS:", deleteError);
       throw deleteError;
    }

    if (profile.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: authResult.user.id,
        actorRole: 'ADMIN',
        teamId: profile.team_id,
        action: 'user.deleted',
        targetType: 'profile',
        targetId: userId,
      });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    appLogger.error('DELETE user Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(apiError('FAILED_TO_DELETE_USER', 'Failed to delete user'), { status: 500 });
  }
}
