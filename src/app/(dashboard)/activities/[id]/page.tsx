import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ActivityDetailView } from './components/ActivityDetailView';

import { SupabaseClient } from '@supabase/supabase-js';
import type { HeartRateZones } from '@/interfaces/athlete';
import type { ActivityDetail } from '@/interfaces/activity';

export const dynamic = 'force-dynamic';

type ActivityRow = {
    id: string | number;
    user_id: string;
    metadata?: Record<string, unknown> | null;
    title?: string | null;
    distance?: number | null;
    duration?: number | null;
    elapsed_time?: number | null;
    elevation_gain?: number | null;
    sport_type?: string | null;
    type?: string | null;
    start_date?: string | null;
    start_date_local?: string | null;
    average_speed?: number | null;
    max_speed?: number | null;
    avg_hr?: number | null;
    max_hr?: number | null;
    average_cadence?: number | null;
    laps?: ActivityDetail['laps'] | null;
    lap_overrides?: Record<string, string> | null;
};

type AthleteProfileRow = {
    athlete_profile?: {
        hr_zones?: HeartRateZones | Array<{ min: number; max: number }> | null;
    } | null;
};

type ActivityMetadata = Partial<Pick<
    ActivityDetail,
    | 'name'
    | 'distance'
    | 'moving_time'
    | 'elapsed_time'
    | 'total_elevation_gain'
    | 'type'
    | 'sport_type'
    | 'start_date'
    | 'start_date_local'
    | 'timezone'
    | 'achievement_count'
    | 'kudos_count'
    | 'average_speed'
    | 'max_speed'
    | 'average_heartrate'
    | 'max_heartrate'
    | 'average_cadence'
    | 'laps'
    | 'splits_metric'
    | 'splits_standard'
>>;

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
        return renderActivityDetail(supabase, user, stravaActivity as ActivityRow);
    }

    return renderActivityDetail(supabase, user, activity as ActivityRow);
}

async function renderActivityDetail(supabase: SupabaseClient, user: { id: string }, activity: ActivityRow) {
    const ownerId = activity.user_id;
    const internalId = activity.id;

    // 2. Fetch everything else in parallel
    const [complianceRes, userDetailsRes, feedbackRes] = await Promise.allSettled([
        supabase.from('activity_compliance').select('*').eq('activity_id', internalId).single(),
        supabase.from('profiles').select('*, athlete_profile:athlete_profiles(*)').eq('id', ownerId).single(),
        supabase.from('activity_feedback').select('*').eq('activity_id', internalId).single()
    ]);

    const compliance = complianceRes.status === 'fulfilled' ? complianceRes.value.data as Record<string, unknown> : null;
    const userProfile = userDetailsRes.status === 'fulfilled' ? userDetailsRes.value.data as AthleteProfileRow : null;
    const feedback = feedbackRes.status === 'fulfilled' ? feedbackRes.value.data as Record<string, unknown> : null;

    // 3. Fetch assignments in parallel
    const { data: assignments } = await supabase
        .from('training_assignments')
        .select('*, training:trainings(*)')
        .eq('user_id', ownerId);

    // The DB stores a compact row but the full Strava payload lives in `metadata`.
    // Merge metadata first so rich fields (laps, splits, start_date_local…) are
    // available, then overlay the authoritative DB columns with the names the
    // component expects (Strava-style field names).
    const metadata: ActivityMetadata = (activity.metadata as ActivityMetadata) ?? {};
    const initialActivity: ActivityDetail = {
        // 1. Rich Strava payload (laps, splits_metric, start_date_local, etc.)
        ...metadata,
        // 2. Authoritative DB columns, mapped to Strava-style names
        id: activity.id,
        name: activity.title ?? metadata.name ?? '',
        distance: activity.distance ?? metadata.distance ?? 0,
        moving_time: activity.duration ?? metadata.moving_time ?? 0,
        elapsed_time: activity.elapsed_time ?? metadata.elapsed_time ?? 0,
        total_elevation_gain: activity.elevation_gain ?? metadata.total_elevation_gain ?? 0,
        sport_type: activity.sport_type ?? activity.type ?? metadata.sport_type ?? metadata.type ?? '',
        type: activity.type ?? metadata.type ?? '',
        start_date: activity.start_date ?? metadata.start_date ?? '',
        start_date_local: activity.start_date_local ?? metadata.start_date_local ?? activity.start_date ?? metadata.start_date ?? '',
        timezone: metadata.timezone ?? '',
        achievement_count: metadata.achievement_count ?? 0,
        kudos_count: metadata.kudos_count ?? 0,
        average_speed: activity.average_speed ?? metadata.average_speed ?? 0,
        max_speed: activity.max_speed ?? metadata.max_speed ?? 0,
        average_heartrate: activity.avg_hr ?? metadata.average_heartrate,
        max_heartrate: activity.max_hr ?? metadata.max_heartrate,
        average_cadence: activity.average_cadence ?? metadata.average_cadence,
        laps: metadata.laps ?? activity.laps ?? undefined,
        splits_metric: metadata.splits_metric,
        splits_standard: metadata.splits_standard,
        lap_overrides: activity.lap_overrides ?? undefined,
        // 3. Internal fields
        _internalId: String(internalId),
        _ownerId: ownerId,
        _viewerIsOwner: ownerId === user.id,
    };

    const rawHrZones = userProfile?.athlete_profile?.hr_zones;
    const initialHRZones: HeartRateZones | null = Array.isArray(rawHrZones)
        ? { zones: rawHrZones }
        : (rawHrZones || null);

    return (
        <ActivityDetailView
            id={String(activity.id)}
            initialActivity={initialActivity}
            initialCompliance={compliance as never}
            initialHRZones={initialHRZones}
            initialAssignments={(assignments || []) as never}
            initialFeedback={(feedback ? { ...feedback, comments: (feedback.comments as string | null) || '' } : null) as never}
        />
    );
}
