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

        // Fetch all trainings for this coach
        const { data: trainings, error } = await supabase
            .from('trainings')
            .select('*')
            .eq('coach_id', user!.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch trainings error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch trainings' },
                { status: 500 }
            );
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
