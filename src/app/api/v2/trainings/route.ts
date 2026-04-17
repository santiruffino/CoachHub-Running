import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * List Trainings
 * 
 * Returns all training templates created by the authenticated coach.
 * 
 * Access: COACH only
 */
export async function GET(request: NextRequest) {
    try {
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

        let query = supabase
            .from('trainings')
            .select('*')
            .order('created_at', { ascending: false });

        if (profile?.team_id) {
            query = query.eq('team_id', profile.team_id);
        } else {
            query = query.eq('coach_id', user!.id);
        }

        const { data: trainings, error } = await query;

        if (error) {
            console.error('Fetch trainings error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch trainings' },
                { status: 500 }
            );
        }

        // Attach Coach Names Manually (to bypass PGRST FK missing issues)
        const coachIds = [...new Set(trainings?.map(t => t.coach_id).filter(Boolean))];
        if (coachIds.length > 0 && trainings) {
            const { data: coachesData } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', coachIds);
                
            const coachMap = new Map(coachesData?.map(c => [c.id, c.name]));
            trainings.forEach((t: any) => {
                if (t.coach_id) {
                    t.coach = { name: coachMap.get(t.coach_id) || 'Unknown Coach' };
                }
            });
        }

        return NextResponse.json(trainings || []);
    } catch (error: any) {
        console.error('Get trainings error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
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
        const body = await request.json();
        const { title, description, type, blocks, isTemplate = true } = body;

        // Validation
        if (!title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        if (!type) {
            return NextResponse.json(
                { error: 'Training type is required' },
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
                team_id: profile?.team_id || null, // Lock to Running Team
            })
            .select()
            .single();

        if (error) {
            console.error('Create training error:', error);
            return NextResponse.json(
                { error: 'Failed to create training' },
                { status: 500 }
            );
        }

        return NextResponse.json(training, { status: 201 });
    } catch (error: any) {
        console.error('Create training error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
