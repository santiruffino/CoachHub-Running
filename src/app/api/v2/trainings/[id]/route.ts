import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Get Training by ID
 * 
 * Fetches a single training by ID. Only the coach who created it can view it.
 * 
 * Access: COACH only
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Fetch the training
        const { data: training, error } = await supabase
            .from('trainings')
            .select('*')
            .eq('id', id)
            .eq('coach_id', user!.id)
            .single();

        if (error || !training) {
            return NextResponse.json(
                { error: 'Training not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(training);
    } catch (error: any) {
        console.error('Get training error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Delete Training
 * 
 * Deletes a training template. Only the coach who created it can delete it.
 * 
 * Access: COACH only
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Verify the training exists and belongs to this coach
        const { data: training, error: fetchError } = await supabase
            .from('trainings')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !training) {
            return NextResponse.json(
                { error: 'Training not found' },
                { status: 404 }
            );
        }

        if (training.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to delete this training' },
                { status: 403 }
            );
        }

        // Delete the training
        const { error: deleteError } = await supabase
            .from('trainings')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Delete training error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete training' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Training deleted successfully' },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Delete training error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Update Training
 * 
 * Updates an existing training template.
 * 
 * Access: COACH only
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const body = await request.json();

        // Verify ownership first
        const { data: existing, error: fetchError } = await supabase
            .from('trainings')
            .select('coach_id')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Training not found' }, { status: 404 });
        }

        if (existing.coach_id !== user!.id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const { data: training, error } = await supabase
            .from('trainings')
            .update({
                title: body.title,
                description: body.description,
                type: body.type,
                blocks: body.blocks,
                expected_rpe: body.expectedRpe,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update training error:', error);
            return NextResponse.json({ error: 'Failed to update training' }, { status: 500 });
        }

        return NextResponse.json(training);
    } catch (error: any) {
        console.error('Update training error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
