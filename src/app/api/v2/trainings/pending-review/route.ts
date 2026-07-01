import { NextRequest, NextResponse } from 'next/server';
import { getRequesterProfile, requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

interface MatchingLogRow {
  assignment_id: string;
  activity_id: string;
  score: number;
  match_details: unknown;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/trainings/pending-review', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { supabase, user } = authResult;
    const { profile: requesterProfile, error: requesterError } = await getRequesterProfile(user!.id);

    if (requesterError || !requesterProfile) {
      return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    if (requesterProfile.role !== 'COACH' && requesterProfile.role !== 'ADMIN') {
      return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    if (!requesterProfile.team_id) {
      return respond({ pendingMatches: [] });
    }

    const serviceSupabase = createServiceRoleClient();

    let athleteIdsQuery = supabase
      .from('profiles')
      .select('id')
      .eq('role', 'ATHLETE')
      .eq('team_id', requesterProfile.team_id);

    if (requesterProfile.role === 'COACH') {
      athleteIdsQuery = athleteIdsQuery.eq('coach_id', requesterProfile.id);
    }

    const { data: athletes } = await athleteIdsQuery;
    const athleteIds = (athletes || []).map((a) => a.id);

    if (athleteIds.length === 0) {
      return respond({ pendingMatches: [] });
    }

    const { data: assignments, error: assignmentsError } = await serviceSupabase
      .from('training_assignments')
      .select(`
        id,
        user_id,
        scheduled_date,
        workout_name,
        training:trainings(title),
        athlete:profiles!training_assignments_user_id_fkey(name)
      `)
      .eq('link_status', 'pending_review')
      .in('user_id', athleteIds)
      .order('scheduled_date', { ascending: false });

    if (assignmentsError) {
      logger.error('pending_review.load_failed', { error: assignmentsError });
      return respond(apiError('PENDING_REVIEW_LOAD_FAILED', 'Failed to load pending matches'), { status: 500 });
    }

    const assignmentRows = assignments || [];
    if (assignmentRows.length === 0) {
      return respond({ pendingMatches: [] });
    }

    const assignmentIds = assignmentRows.map((a) => a.id);

    const { data: matchingLogRows } = await serviceSupabase
      .from('matching_log')
      .select('assignment_id, activity_id, score, match_details, created_at')
      .in('assignment_id', assignmentIds)
      .order('score', { ascending: false });

    const bestCandidateByAssignment = new Map<string, MatchingLogRow>();
    for (const row of (matchingLogRows || []) as MatchingLogRow[]) {
      if (!bestCandidateByAssignment.has(row.assignment_id)) {
        bestCandidateByAssignment.set(row.assignment_id, row);
      }
    }

    const candidateActivityIds = Array.from(bestCandidateByAssignment.values()).map((row) => row.activity_id);
    const { data: activityRows } = candidateActivityIds.length
      ? await serviceSupabase
          .from('activities')
          .select('id, title, distance, duration, start_date')
          .in('id', candidateActivityIds)
      : { data: [] };

    const activityById = new Map((activityRows || []).map((row) => [row.id, row]));

    const pendingMatches = assignmentRows
      .map((assignment) => {
        const candidate = bestCandidateByAssignment.get(assignment.id);
        if (!candidate) return null;

        const activity = activityById.get(candidate.activity_id);
        const trainingRelation = Array.isArray(assignment.training) ? assignment.training[0] : assignment.training;
        const athleteRelation = Array.isArray(assignment.athlete) ? assignment.athlete[0] : assignment.athlete;

        return {
          assignmentId: assignment.id,
          athleteName: athleteRelation?.name || 'Athlete',
          workoutName: assignment.workout_name || trainingRelation?.title || 'Workout',
          scheduledDate: assignment.scheduled_date,
          confidence: Math.round((candidate.score || 0) * 100),
          candidateActivity: activity
            ? {
                id: activity.id,
                title: activity.title,
                distance: activity.distance,
                duration: activity.duration,
                startDate: activity.start_date,
              }
            : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return respond({ pendingMatches });
  } catch (error: unknown) {
    logger.error('pending_review.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/trainings/pending-review', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
