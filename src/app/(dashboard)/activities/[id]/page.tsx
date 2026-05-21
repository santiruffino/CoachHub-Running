import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ActivityDetailView } from './components/ActivityDetailView';

import { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // 1. Fetch activity first to get ownerId
    const { data: activity, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single();

    if (activityError || !activity) {
        // Fallback for Strava ID if not found by UUID
        const { data: stravaActivity, error: stravaError } = await supabase
            .from('activities')
            .select('*')
            .eq('strava_id', id)
            .single();

        if (stravaError || !stravaActivity) {
            redirect('/dashboard');
        }
        
        // Re-assign to use the found record
        return renderActivityDetail(supabase, user, stravaActivity);
    }

    return renderActivityDetail(supabase, user, activity);
}

async function renderActivityDetail(supabase: SupabaseClient, user: { id: string }, activity: Record<string, any>) {
    const ownerId = activity.user_id;
    const internalId = activity.id;

    // 2. Fetch everything else in parallel
    const [complianceRes, userDetailsRes, feedbackRes] = await Promise.allSettled([
        supabase.from('activity_compliance').select('*').eq('activity_id', internalId).single(),
        supabase.from('profiles').select('*, athlete_profile:athlete_profiles(*)').eq('id', ownerId).single(),
        supabase.from('activity_feedback').select('*').eq('activity_id', internalId).single()
    ]);

    const compliance = complianceRes.status === 'fulfilled' ? complianceRes.value.data as Record<string, any> : null;
    const userProfile = userDetailsRes.status === 'fulfilled' ? userDetailsRes.value.data as Record<string, any> : null;
    const feedback = feedbackRes.status === 'fulfilled' ? feedbackRes.value.data as Record<string, any> : null;

    // 3. Fetch assignments in parallel
    const { data: assignments } = await supabase
        .from('training_assignments')
        .select('*, training:trainings(*)')
        .eq('user_id', ownerId);

    // The DB stores a compact row but the full Strava payload lives in `metadata`.
    // Merge metadata first so rich fields (laps, splits, start_date_local…) are
    // available, then overlay the authoritative DB columns with the names the
    // component expects (Strava-style field names).
    const metadata: Record<string, unknown> = (activity.metadata as Record<string, unknown>) ?? {};
    const initialActivity = {
        // 1. Rich Strava payload (laps, splits_metric, start_date_local, etc.)
        ...metadata,
        // 2. Authoritative DB columns, mapped to Strava-style names
        id: activity.id,
        name: activity.title ?? metadata.name,
        distance: activity.distance ?? metadata.distance ?? 0,
        moving_time: activity.duration ?? metadata.moving_time ?? 0,
        elapsed_time: activity.elapsed_time ?? metadata.elapsed_time ?? 0,
        total_elevation_gain: activity.elevation_gain ?? metadata.total_elevation_gain ?? 0,
        sport_type: activity.sport_type ?? activity.type ?? metadata.sport_type ?? metadata.type ?? '',
        type: activity.type ?? metadata.type ?? '',
        start_date: activity.start_date ?? metadata.start_date ?? '',
        start_date_local: activity.start_date_local ?? metadata.start_date_local ?? activity.start_date ?? metadata.start_date ?? '',
        average_speed: activity.average_speed ?? metadata.average_speed ?? 0,
        max_speed: activity.max_speed ?? metadata.max_speed ?? 0,
        average_heartrate: activity.avg_hr ?? metadata.average_heartrate ?? null,
        max_heartrate: activity.max_hr ?? metadata.max_heartrate ?? null,
        lap_overrides: activity.lap_overrides ?? null,
        // 3. Internal fields
        _internalId: internalId,
        _ownerId: ownerId,
        _viewerIsOwner: ownerId === user.id,
    };

    const initialHRZones = userProfile?.athlete_profile?.hr_zones || null;

    return (
        <ActivityDetailView
            id={activity.id}
            initialActivity={initialActivity as any}
            initialCompliance={compliance as any}
            initialHRZones={initialHRZones ? { zones: initialHRZones } : null}
            initialAssignments={(assignments || []) as any}
            initialFeedback={(feedback ? { ...feedback, comments: feedback.comments || '' } : null) as any}
        />
    );
}
