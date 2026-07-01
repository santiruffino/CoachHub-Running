import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

interface TrainingRow {
    created_by: string | null;
    coach?: {
        name: string;
    };
    [key: string]: unknown;
}

/**
 * List Trainings
 * 
 * Returns all training templates created by the authenticated coach.
 * 
 * Access: COACH only
 */
export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/trainings', request);
    try {
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        if (!profile?.team_id) {
            return NextResponse.json(apiError('AUTH_COACH_TEAM_REQUIRED'),
                { status: 403 }
            );
        }

        let query = supabase
            .from('trainings')
            .select('*')
            .order('created_at', { ascending: false });

        query = query.eq('team_id', profile.team_id);

        const { data: trainings, error } = await query;

        if (error) {
            logger.error('Fetch trainings error', { error: error });
            return NextResponse.json(apiError('FAILED_TO_FETCH_TRAININGS'),
                { status: 500 }
            );
        }

        // Attach Coach Names Manually (to bypass PGRST FK missing issues)
        const mutableTrainings = (trainings || []) as TrainingRow[];
        const creatorIds = [
            ...new Set(
                mutableTrainings
                    .map((training) => training.created_by)
                    .filter((value): value is string => typeof value === 'string' && value.length > 0)
            )
        ];
        if (creatorIds.length > 0 && trainings) {
            const { data: coachesData } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', creatorIds);

            const coachMap = new Map((coachesData || []).map(c => [c.id, c.name]));
            mutableTrainings.forEach((training) => {
                if (training.created_by) {
                    training.coach = { name: coachMap.get(training.created_by) || 'Unknown Coach' };
                }
            });
        }

        return NextResponse.json(mutableTrainings);
    } catch (error: unknown) {
        logger.error('Get trainings error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/trainings', method: 'GET', requestId },
        });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}

/**
 * Create Training
 * 
 * Creates a new training template.
 * 
 * Access: COACH only
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/trainings', request);
    try {
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        const body = (await request.json()) as {
            title?: string;
            description?: string;
            type?: string;
            blocks?: unknown;
            isTemplate?: boolean;
        };
        const { title, description, type, blocks, isTemplate = true } = body;

        // Validation
        if (!title) {
            return NextResponse.json(apiError('VALIDATION_TITLE_IS_REQUIRED'),
                { status: 400 }
            );
        }

        if (!type) {
            return NextResponse.json(apiError('VALIDATION_TRAINING_TYPE_IS_REQUIRED'),
                { status: 400 }
            );
        }

        // Create training
        const { data: training, error } = await supabase
            .from('trainings')
            .insert({
                title,
                description,
                type,
                blocks,
                is_template: isTemplate,
                coach_id: user!.id,
                created_by: user!.id,
                team_id: profile?.team_id || null, // Lock to Running Team
            })
            .select()
            .single();

        if (error) {
            logger.error('Create training error', { error: error });
            return NextResponse.json(apiError('FAILED_TO_CREATE_TRAINING'),
                { status: 500 }
            );
        }

        return NextResponse.json(training, { status: 201 });
    } catch (error: unknown) {
        logger.error('Create training error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/trainings', method: 'POST', requestId },
        });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
