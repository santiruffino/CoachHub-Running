import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { reportApiError } from '@/lib/api/report-error';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/coaches/[id]', _request);
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const { id: targetCoachId } = await params;
  const adminId = authResult.user.id;
  const supabase = authResult.supabase;

  try {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', adminId)
      .single();

    if (!adminProfile?.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    const { data: targetCoach } = await supabase
      .from('profiles')
      .select('id, team_id')
      .eq('id', targetCoachId)
      .eq('role', 'COACH')
      .single();

    if (!targetCoach) {
      return NextResponse.json(apiError('COACH_NOT_FOUND'), { status: 404 });
    }

    if (targetCoach.team_id !== adminProfile.team_id) {
      return NextResponse.json(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    // 1. Reassign athletes in the same team to the admin
    const { error: reassignError } = await supabase
      .from('profiles')
      .update({ coach_id: adminId })
      .eq('team_id', adminProfile.team_id)
      .eq('coach_id', targetCoachId)
      .eq('role', 'ATHLETE');

    if (reassignError) {
      logger.error('Reassign athletes error', { error: reassignError });
      throw reassignError;
    }

    // 2. Delete the coach profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('team_id', adminProfile.team_id)
      .eq('id', targetCoachId)
      .eq('role', 'COACH');

    if (deleteError) {
      logger.error('Delete coach error', { error: deleteError });
      throw deleteError;
    }

    await appendAdminActionLog({
      actorId: adminId,
      actorRole: 'ADMIN',
      teamId: adminProfile.team_id,
      action: 'coach.deleted',
      targetType: 'profile',
      targetId: targetCoachId,
      metadata: {
        reassignedAthletesToAdminId: adminId,
      },
    });

    return NextResponse.json({ message: 'Coach deleted and athletes reassigned successfully' });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/v2/users/coaches/[id]', method: 'DELETE', requestId, logger });
    return NextResponse.json(apiError('FAILED_TO_DELETE_COACH_AND_REASSIGN_ATHLETES'), { status: 500 });
  }
}
