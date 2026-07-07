import { NextRequest, NextResponse } from 'next/server';
import { getRequesterProfile, requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

interface ResolveMatchBody {
  action?: 'approve' | 'reject';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/trainings/assignments/[id]/resolve-match', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const { id: assignmentId } = await params;
    const payload = (await request.json()) as ResolveMatchBody;

    if (payload.action !== 'approve' && payload.action !== 'reject') {
      return respond(apiError('VALIDATION_INVALID_ACTION', 'action must be "approve" or "reject"'), { status: 400 });
    }

    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const { profile: requesterProfile, error: requesterError } = await getRequesterProfile(user!.id);

    if (requesterError || !requesterProfile) {
      return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    if (requesterProfile.role !== 'COACH' && requesterProfile.role !== 'ADMIN') {
      return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: assignment, error: assignmentError } = await serviceSupabase
      .from('training_assignments')
      .select('id, user_id, link_status')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return respond(apiError('ASSIGNMENT_NOT_FOUND'), { status: 404 });
    }

    if (assignment.link_status !== 'pending_review') {
      return respond(apiError('ASSIGNMENT_NOT_PENDING_REVIEW', 'This assignment has no pending match to resolve'), { status: 409 });
    }

    const { data: athleteProfile, error: athleteError } = await serviceSupabase
      .from('profiles')
      .select('team_id, coach_id')
      .eq('id', assignment.user_id)
      .single();

    if (
      athleteError ||
      !athleteProfile ||
      !requesterProfile.team_id ||
      athleteProfile.team_id !== requesterProfile.team_id ||
      (requesterProfile.role === 'COACH' && athleteProfile.coach_id !== requesterProfile.id)
    ) {
      return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    if (payload.action === 'reject') {
      const { error: rejectError } = await serviceSupabase
        .from('training_assignments')
        .update({ link_status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (rejectError) {
        logger.error('resolve_match.reject_failed', { error: rejectError, assignmentId });
        return respond(apiError('RESOLVE_MATCH_FAILED', 'Failed to reject match'), { status: 500 });
      }

      return respond({ success: true, action: 'reject' });
    }

    const { data: bestCandidate, error: candidateError } = await serviceSupabase
      .from('matching_log')
      .select('activity_id, score')
      .eq('assignment_id', assignmentId)
      .order('score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (candidateError || !bestCandidate) {
      return respond(apiError('NO_CANDIDATE_ACTIVITY_FOUND', 'No candidate activity found for this assignment'), { status: 404 });
    }

    const { error: approveError } = await serviceSupabase
      .from('training_assignments')
      .update({
        strava_activity_id: bestCandidate.activity_id,
        compliance_status: 'completed',
        completed: true,
        link_status: 'manually_linked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (approveError) {
      logger.error('resolve_match.approve_failed', { error: approveError, assignmentId });
      return respond(apiError('RESOLVE_MATCH_FAILED', 'Failed to approve match'), { status: 500 });
    }

    return respond({ success: true, action: 'approve' });
  } catch (error: unknown) {
    logger.error('resolve_match.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/trainings/assignments/[id]/resolve-match', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
