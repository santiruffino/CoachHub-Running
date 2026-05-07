import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { formatSecondsToHhMmSs, parseDurationInput } from '@/lib/time/duration';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

/**
 * GET /v2/users/[id]/races
 * 
 * Fetches races for a specific user.
 * 
 * Permissions:
 * - User can view their own races
 * - Coach can view their athletes' races
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/races', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // Check permissions
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
                    logger.warn('user_races.forbidden_cross_team_access', { userId: user!.id, targetUserId });
                    return respond(
                        { error: 'Not authorized to view this user\'s races' },
                        { status: 403 }
                    );
                }
            } else {
                logger.warn('user_races.forbidden_role_access', { userId: user!.id, targetUserId });
                return respond(
                    { error: 'Not authorized to view this user\'s races' },
                    { status: 403 }
                );
            }
        }

        // Fetch athlete races with joined race info
        const { data: athleteRaces, error } = await supabase
            .from('athlete_races')
            .select(`
                *,
                race:races(*)
            `)
            .eq('athlete_id', targetUserId)
            .order('date', { ascending: true });

        if (error) {
            logger.error('user_races.fetch_failed', { userId: user!.id, targetUserId, error });
            return respond(
                { error: 'Failed to fetch athlete races' },
                { status: 500 }
            );
        }

        return respond(athleteRaces || [], { status: 200 });
    } catch (error: unknown) {
        logger.error('user_races.get_unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/users/[id]/races', requestId },
        });
        return respond(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /v2/users/[id]/races
 * 
 * Assigns a race to a user.
 * 
 * Permissions:
 * - Athletes can manage their own races
 * - Coaches and admins can manage races for athletes in their team
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/races', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const authResult = await requireAuth();
        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        if (user!.id !== targetUserId) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('role, team_id')
                .eq('id', user!.id)
                .single();

            if (userProfile?.role !== 'COACH' && userProfile?.role !== 'ADMIN') {
                logger.warn('user_races.create_forbidden_role', { userId: user!.id, targetUserId });
                return respond(
                    { error: 'Not authorized to assign races to this athlete' },
                    { status: 403 }
                );
            }

            const { data: athleteProfile } = await supabase
                .from('profiles')
                .select('team_id')
                .eq('id', targetUserId)
                .single();

            if (!athleteProfile || !userProfile.team_id || athleteProfile.team_id !== userProfile.team_id) {
                logger.warn('user_races.create_forbidden_cross_team', { userId: user!.id, targetUserId });
                return respond(
                    { error: 'Not authorized to assign races to this athlete' },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const {
            race_id,
            name_override,
            date,
            priority,
            target_time,
            status,
            notes
        } = body;

        let normalizedTargetTime: string | null = null;
        if (typeof target_time === 'string' && target_time.trim().length > 0) {
            const parsed = parseDurationInput(target_time);
            if (parsed === null || parsed <= 0) {
                return respond(
                    { error: 'Invalid target_time format. Use HH:MM:SS, MM:SS, or 1h20m' },
                    { status: 400 }
                );
            }
            normalizedTargetTime = formatSecondsToHhMmSs(parsed);
        }

        if (!date) {
            return respond(
                { error: 'Race date is required' },
                { status: 400 }
            );
        }

        const { data: athleteRace, error } = await supabase
            .from('athlete_races')
            .insert({
                athlete_id: targetUserId,
                race_id,
                name_override,
                date,
                priority: priority || 'C',
                target_time: normalizedTargetTime,
                status: status || 'PLANNED',
                notes
            })
            .select(`
                *,
                race:races(*)
            `)
            .single();

        if (error) {
            logger.error('user_races.create_failed', { userId: user!.id, targetUserId, error });
            return respond(
                { error: 'Failed to assign race' },
                { status: 500 }
            );
        }

        logger.info('user_races.created', { userId: user!.id, targetUserId, athleteRaceId: athleteRace?.id });
        return respond(athleteRace, { status: 201 });
    } catch (error: unknown) {
        logger.error('user_races.post_unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/users/[id]/races', requestId },
        });
        return respond(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
