import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
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
    try {
        void request;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json(apiError('COACH_MUST_BELONG_TO_A_TEAM', 'Coach must belong to a team'),
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
            appLogger.error('Fetch trainings error:', error);
            return NextResponse.json(apiError('FAILED_TO_FETCH_TRAININGS', 'Failed to fetch trainings'),
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
        appLogger.error('Get trainings error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
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
    try {
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
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
            return NextResponse.json(apiError('VALIDATION_TITLE_IS_REQUIRED', 'Title is required'),
                { status: 400 }
            );
        }

        if (!type) {
            return NextResponse.json(apiError('VALIDATION_TRAINING_TYPE_IS_REQUIRED', 'Training type is required'),
                { status: 400 }
            );
        }

        // Fetch Coach Profile to get team_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

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
            appLogger.error('Create training error:', error);
            return NextResponse.json(apiError('FAILED_TO_CREATE_TRAINING', 'Failed to create training'),
                { status: 500 }
            );
        }

        return NextResponse.json(training, { status: 201 });
    } catch (error: unknown) {
        appLogger.error('Create training error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
            { status: 500 }
        );
    }
}
