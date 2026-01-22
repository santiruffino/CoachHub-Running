import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { format } from 'date-fns';

/**
 * Get Workout Match for Training Assignment
 * 
 * Compares a planned workout with completed activities to determine execution quality.
 * Uses hybrid matching: auto-match by date, with ability to specify activity manually.
 * 
 * Query params:
 * - activityId (optional): Manually specify which activity to match with
 * 
 * Access: Authenticated users (athletes for their own, coaches for their athletes)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const assignmentId = id;

        // Get manual activity ID from query params if provided
        const { searchParams } = new URL(request.url);
        const manualActivityId = searchParams.get('activityId');

        // Fetch assignment with training details
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                user_id,
                scheduled_date,
                completed,
                training:trainings!inner(
                    id,
                    title,
                    type,
                    blocks,
                    coach_id
                )
            `)
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        const training = assignment.training as unknown as {
            id: string;
            title: string;
            type: string;
            blocks: any[];
            coach_id: string;
        };

        // Authorization check
        if (user!.role === 'ATHLETE' && assignment.user_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to view this assignment' },
                { status: 403 }
            );
        }

        // If coach, verify they can access this athlete's data
        if (user!.role === 'COACH' && training.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to view this assignment' },
                { status: 403 }
            );
        }

        // Find matching activity
        let matchedActivity = null;

        if (manualActivityId) {
            // Manual match: use specified activity
            const { data: activity } = await supabase
                .from('activities')
                .select('*')
                .eq('id', manualActivityId)
                .eq('user_id', assignment.user_id)
                .single();

            matchedActivity = activity;
        } else {
            // Auto-match: find activities on the same date
            const scheduledDate = new Date(assignment.scheduled_date);
            const dateStr = format(scheduledDate, 'yyyy-MM-dd');

            const { data: activities } = await supabase
                .from('activities')
                .select('*')
                .eq('user_id', assignment.user_id)
                .gte('start_date', `${dateStr}T00:00:00`)
                .lte('start_date', `${dateStr}T23:59:59`)
                .order('start_date', { ascending: true });

            if (activities && activities.length > 0) {
                // If multiple activities on same day, pick the best match
                // based on distance/duration similarity to the planned workout
                if (activities.length === 1) {
                    matchedActivity = activities[0];
                } else {
                    // Calculate planned distance and duration
                    const { plannedDistance, plannedDuration } = calculatePlannedMetrics(training.blocks);

                    // Find activity with most similar distance OR duration
                    matchedActivity = activities.reduce((best, curr) => {
                        const bestDiffDist = Math.abs((best.distance || 0) - plannedDistance);
                        const currDiffDist = Math.abs((curr.distance || 0) - plannedDistance);
                        const bestDiffTime = Math.abs((best.duration || 0) - plannedDuration);
                        const currDiffTime = Math.abs((curr.duration || 0) - plannedDuration);

                        // Score based on both distance and time similarity
                        const bestScore = (bestDiffDist / (plannedDistance || 1)) + (bestDiffTime / (plannedDuration || 1));
                        const currScore = (currDiffDist / (plannedDistance || 1)) + (currDiffTime / (plannedDuration || 1));

                        return currScore < bestScore ? curr : best;
                    });
                }
            }
        }

        // If no match found, return unmatched result
        if (!matchedActivity) {
            return NextResponse.json({
                matched: false,
                assignmentId,
                scheduledDate: assignment.scheduled_date,
            });
        }

        // Calculate match quality
        const matchQuality = calculateMatchQuality(training.blocks, matchedActivity);

        // Calculate block-by-block comparison (optional detailed view)
        const blockComparison = calculateBlockComparison(training.blocks, matchedActivity);

        return NextResponse.json({
            matched: true,
            assignmentId,
            scheduledDate: assignment.scheduled_date,
            activity: {
                id: matchedActivity.id,
                externalId: matchedActivity.external_id,
                title: matchedActivity.title,
                distance: matchedActivity.distance,
                duration: matchedActivity.duration,
                startDate: matchedActivity.start_date,
            },
            matchQuality,
            blockComparison,
        });
    } catch (error: any) {
        console.error('Get workout match error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Calculate planned distance and duration from workout blocks
 */
function calculatePlannedMetrics(blocks: any[]): { plannedDistance: number; plannedDuration: number } {
    if (!blocks || blocks.length === 0) {
        return { plannedDistance: 0, plannedDuration: 0 };
    }

    let totalDistance = 0;
    let totalDuration = 0;
    const processedGroupIds = new Set<string>();

    blocks.forEach((block: any) => {
        // Skip if this block's group has already been processed
        if (block.group?.id && processedGroupIds.has(block.group.id)) {
            return;
        }

        if (block.group?.id) {
            processedGroupIds.add(block.group.id);
            const groupBlocks = blocks.filter((b: any) => b.group?.id === block.group?.id);
            const reps = block.group.reps || 1;

            groupBlocks.forEach((b: any) => {
                const { distance, duration } = getBlockMetrics(b);
                totalDistance += distance * reps;
                totalDuration += duration * reps;
            });
        } else {
            const { distance, duration } = getBlockMetrics(block);
            totalDistance += distance;
            totalDuration += duration;
        }
    });

    return { plannedDistance: totalDistance, plannedDuration: totalDuration };
}

/**
 * Get distance and duration for a single block
 */
function getBlockMetrics(block: any): { distance: number; duration: number } {
    let distance = 0;
    let duration = 0;

    if (block.duration?.type === 'distance') {
        distance = block.duration.value || 0;
        // Estimate duration based on target pace if available
        if (block.target?.type === 'pace' && block.target?.min) {
            const paceSeconds = parsePace(block.target.min);
            duration = (distance / 1000) * paceSeconds;
        } else {
            // Default pace of 5:00 min/km
            duration = (distance / 1000) * 300;
        }
    } else if (block.duration?.type === 'time') {
        duration = block.duration.value || 0;
        // Can't estimate distance from time without pace data
    }

    return { distance, duration };
}

/**
 * Parse pace string "4:30" to seconds per km
 */
function parsePace(paceStr: string): number {
    if (!paceStr || typeof paceStr !== 'string') return 300;
    const parts = paceStr.split(':');
    if (parts.length !== 2) return 300;
    const mins = parseInt(parts[0]);
    const secs = parseInt(parts[1]);
    if (isNaN(mins) || isNaN(secs)) return 300;
    return mins * 60 + secs;
}

/**
 * Calculate match quality metrics based on workout objective
 */
function calculateMatchQuality(blocks: any[], activity: any): any {
    const { plannedDistance, plannedDuration } = calculatePlannedMetrics(blocks);

    // Determine primary objective: distance or time
    const hasDistanceBlocks = blocks.some(b => b.duration?.type === 'distance');
    const objectiveType = hasDistanceBlocks ? 'distance' : 'time';

    // Calculate percentage differences
    const actualDistance = activity.distance || 0;
    const actualDuration = activity.duration || 0;

    const distanceDiff = plannedDistance > 0
        ? ((actualDistance - plannedDistance) / plannedDistance) * 100
        : 0;

    const durationDiff = plannedDuration > 0
        ? ((actualDuration - plannedDuration) / plannedDuration) * 100
        : 0;

    // Calculate objective match (how close to the primary goal)
    const objectiveMatch = objectiveType === 'distance'
        ? Math.max(0, 100 - Math.abs(distanceDiff))
        : Math.max(0, 100 - Math.abs(durationDiff));

    // Calculate overall score weighted by objective
    let overallScore = objectiveMatch * 0.7; // 70% weight on primary objective

    // Add secondary metrics (30% weight)
    const secondaryMatch = objectiveType === 'distance'
        ? Math.max(0, 100 - Math.abs(durationDiff) / 2) // Duration less critical for distance workouts
        : Math.max(0, 100 - Math.abs(distanceDiff) / 2); // Distance less critical for time workouts

    overallScore += secondaryMatch * 0.3;

    return {
        overallScore: Math.round(overallScore),
        objectiveType,
        objectiveMatch: Math.round(objectiveMatch),
        distanceMatch: Math.round(distanceDiff * 10) / 10, // One decimal
        durationMatch: Math.round(durationDiff * 10) / 10,
        plannedDistance: Math.round(plannedDistance),
        plannedDuration: Math.round(plannedDuration),
        actualDistance: Math.round(actualDistance),
        actualDuration: Math.round(actualDuration),
    };
}

/**
 * Calculate block-by-block comparison
 */
function calculateBlockComparison(blocks: any[], activity: any): any[] {
    // For now, return simplified block info
    // This could be enhanced with detailed split analysis if lap data is available
    return blocks.map((block, index) => {
        const { distance, duration } = getBlockMetrics(block);

        return {
            blockId: block.id || `block-${index}`,
            blockName: block.stepName || block.type,
            blockType: block.type,
            planned: {
                duration: Math.round(duration),
                distance: Math.round(distance),
                targetPace: block.target?.type === 'pace' ? {
                    min: block.target.min,
                    max: block.target.max,
                } : undefined,
                targetType: block.target?.type,
            },
            // Actual block data would require lap/split analysis from activity
            // which is a more complex feature for future enhancement
        };
    });
}
