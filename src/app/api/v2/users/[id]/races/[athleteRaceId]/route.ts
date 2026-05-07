import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { formatSecondsToHhMmSs, parseDurationInput } from '@/lib/time/duration';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

/**
 * PATCH /v2/users/[id]/races/[athleteRaceId]
 * 
 * Updates a specific race assignment for an athlete.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; athleteRaceId: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/races/[athleteRaceId]', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id, athleteRaceId } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // Permission Check
        if (user!.id !== targetUserId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, team_id')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH' || profile?.role === 'ADMIN') {
                // Verify athlete belongs to the same team
                const { data: athleteProfile } = await supabase
                    .from('profiles')
                    .select('team_id')
                    .eq('id', targetUserId)
                    .single();

                if (!athleteProfile || !profile.team_id || athleteProfile.team_id !== profile.team_id) {
                    logger.warn('user_race_update.forbidden_cross_team_access', { userId: user!.id, targetUserId });
                    return respond(
                        { error: 'Not authorized to update this user\'s races' },
                        { status: 403 }
                    );
                }
            } else {
                logger.warn('user_race_update.forbidden_role_access', { userId: user!.id, targetUserId });
                return respond(
                    { error: 'Not authorized to update this user\'s races' },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const {
            name_override,
            date,
            priority,
            target_time,
            status,
            result_time,
            notes
        } = body;

        let normalizedTargetTime: string | null | undefined;
        if (target_time === null || target_time === '') {
            normalizedTargetTime = null;
        } else if (typeof target_time === 'string') {
            const parsedTarget = parseDurationInput(target_time);
            if (parsedTarget === null || parsedTarget <= 0) {
                return respond(
                    { error: 'Invalid target_time format. Use HH:MM:SS, MM:SS, or 1h20m' },
                    { status: 400 }
                );
            }
            normalizedTargetTime = formatSecondsToHhMmSs(parsedTarget);
        }

        let normalizedResultTime: string | null | undefined;
        if (result_time === null || result_time === '') {
            normalizedResultTime = null;
        } else if (typeof result_time === 'string') {
            const parsedResult = parseDurationInput(result_time);
            if (parsedResult === null || parsedResult <= 0) {
                return respond(
                    { error: 'Invalid result_time format. Use HH:MM:SS, MM:SS, or 1h20m' },
                    { status: 400 }
                );
            }
            normalizedResultTime = formatSecondsToHhMmSs(parsedResult);
        }

        const { data: athleteRace, error } = await supabase
            .from('athlete_races')
            .update({
                name_override,
                date,
                priority,
                target_time: normalizedTargetTime,
                status,
                result_time: normalizedResultTime,
                notes
            })
            .eq('id', athleteRaceId)
            .eq('athlete_id', targetUserId)
            .select(`
                *,
                race:races(*)
            `)
            .single();

        if (error) {
            logger.error('user_race_update.failed', { userId: user!.id, targetUserId, athleteRaceId, error });
            return respond(
                { error: 'Failed to update race assignment' },
                { status: 500 }
            );
        }

        logger.info('user_race_update.success', { userId: user!.id, targetUserId, athleteRaceId });
        return respond(athleteRace, { status: 200 });
    } catch (error: unknown) {
        logger.error('user_race_update.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/users/[id]/races/[athleteRaceId]', requestId, method: 'PATCH' },
        });
        return respond(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /v2/users/[id]/races/[athleteRaceId]
 * 
 * Removes a race assignment.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; athleteRaceId: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/races/[athleteRaceId]', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id, athleteRaceId } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (profile?.role === 'COACH' || profile?.role === 'ADMIN') {
            // Verify athlete belongs to the same team
            const { data: athleteProfile } = await supabase
                .from('profiles')
                .select('team_id')
                .eq('id', targetUserId)
                .single();

            if (!athleteProfile || !profile.team_id || athleteProfile.team_id !== profile.team_id) {
                logger.warn('user_race_delete.forbidden_cross_team_access', { userId: user!.id, targetUserId });
                return respond(
                    { error: 'Not authorized to delete this user\'s races' },
                    { status: 403 }
                );
            }
        } else {
            // Athletes cannot delete assignments
            logger.warn('user_race_delete.forbidden_role_access', { userId: user!.id, role: profile?.role });
            return respond(
                { error: 'Not authorized to delete race assignments' },
                { status: 403 }
            );
        }

        const { error } = await supabase
            .from('athlete_races')
            .delete()
            .eq('id', athleteRaceId)
            .eq('athlete_id', targetUserId);

        if (error) {
            logger.error('user_race_delete.failed', { userId: user!.id, targetUserId, athleteRaceId, error });
            return respond(
                { error: 'Failed to delete race assignment' },
                { status: 500 }
            );
        }

        logger.info('user_race_delete.success', { userId: user!.id, targetUserId, athleteRaceId });
        return new Response(null, withRequestId({ status: 204 }, requestId));
    } catch (error: unknown) {
        logger.error('user_race_delete.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/users/[id]/races/[athleteRaceId]', requestId, method: 'DELETE' },
        });
        return respond(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
