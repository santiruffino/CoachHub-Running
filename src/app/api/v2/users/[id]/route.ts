import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { z } from 'zod';
import { updateUserSchema, validateBody } from '@/lib/validation/schemas';
import { reportApiError } from '@/lib/api/report-error';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/[id]', request);
  const { user, supabase, profile, response } = await requireRole(['ADMIN', 'COACH']);
  if (response) return response;

  const { id: userId } = await params;

  try {
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('team_id, coach_id')
      .eq('id', userId)
      .single();
        
    if (!targetUser) {
      return NextResponse.json(apiError('USER_NOT_FOUND'), { status: 404 });
    }

    // Both Admins and Coaches can edit athletes within their team
    if (targetUser.team_id !== profile!.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    // Coach permission check: coaches can only manage their own athletes
    if (profile!.role === 'COACH') {
      const targetCoachId = targetUser.coach_id;
      // Allow if athlete has no coach assigned (coach_id is null) or coach_id matches the coach's user ID
      if (targetCoachId !== null && targetCoachId !== user!.id) {
        return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Coaches can only manage their own athletes'), { status: 403 });
      }
    }

    let body: z.infer<typeof updateUserSchema>;
    try {
      const rawBody = await request.json();
      const { data, error } = validateBody(updateUserSchema, rawBody);
      if (error) {
        return NextResponse.json(
          apiError('VALIDATION_ERROR', error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')),
          { status: 400 }
        );
      }
      body = data!;
    } catch {
      return NextResponse.json(apiError('INVALID_JSON', 'Invalid JSON body'), { status: 400 });
    }

    const updateData: Partial<{ name: string; coach_id: string | null }> = {};
    if (body.name !== undefined) updateData.name = body.name;
    // Only admins can change coach_id assignment
    if (body.coach_id !== undefined && profile!.role === 'ADMIN') {
        updateData.coach_id = body.coach_id === 'none' ? null : body.coach_id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(apiError('VALIDATION_NO_DATA_TO_UPDATE'), { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) throw updateError;

    if (profile!.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: user!.id,
        actorRole: 'ADMIN',
        teamId: profile!.team_id!,
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
    reportApiError(error, { route: '/api/v2/users/[id]', method: 'PATCH', requestId, logger });
    return NextResponse.json(apiError('FAILED_TO_UPDATE_USER'), { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/[id]', _request);
  const { user, supabase, profile, response } = await requireRole(['ADMIN', 'COACH']);
  if (response) return response;

  const { id: userId } = await params;

  try {
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('team_id, coach_id')
      .eq('id', userId)
      .single();
        
    if (!targetUser) {
      return NextResponse.json(apiError('USER_NOT_FOUND'), { status: 404 });
    }

    // Both Admins and Coaches can delete athletes within their team
    if (targetUser.team_id !== profile!.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    // Coach permission check: coaches can only delete their own athletes
    if (profile!.role === 'COACH') {
      const targetCoachId = targetUser.coach_id;
      // Allow if athlete has no coach assigned (coach_id is null) or coach_id matches the coach's user ID
      if (targetCoachId !== null && targetCoachId !== user!.id) {
        return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Coaches can only delete their own athletes'), { status: 403 });
      }
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
       logger.error('Failed to delete profile, possibly RLS', { error: deleteError });
       throw deleteError;
    }

    if (profile!.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: user!.id,
        actorRole: 'ADMIN',
        teamId: profile!.team_id!,
        action: 'user.deleted',
        targetType: 'profile',
        targetId: userId,
      });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/users/[id]', method: 'DELETE', requestId, logger });
    return NextResponse.json(apiError('FAILED_TO_DELETE_USER'), { status: 500 });
  }
}
