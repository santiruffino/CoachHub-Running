export interface Activity {
    id: string | number;
    external_id: string;
    title: string;
    distance: number;
    duration: number;
    start_date: string;
    type: string;
}

export interface SegmentEffort {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    pr_rank?: number | null;
    kom_rank?: number | null;
    achievements: Array<{
        type_id: number;
        type: string;
        rank: number;
    }>;
    segment: {
        name: string;
        distance: number;
        average_grade: number;
        city?: string;
        state?: string;
        country?: string;
    };
}

export interface Split {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone?: number;
}

export interface Lap {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    lap_index: number;
    total_elevation_gain: number;
}

export interface ActivityDetail {
    id: number | string;
    name: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    type: string;
    sport_type: string;
    start_date: string;
    start_date_local: string;
    timezone: string;
    achievement_count: number;
    kudos_count: number;
    average_speed: number;
    max_speed: number;
    average_cadence?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    calories?: number;
    device_name?: string;
    map?: {
        polyline?: string;
        summary_polyline?: string;
    };
    segment_efforts?: SegmentEffort[];
    splits_metric?: Split[];
    splits_standard?: Split[];
    laps?: Lap[];
    suffer_score?: number;
    average_watts?: number;
    max_watts?: number;
    _viewerIsOwner?: boolean;
    _ownerId?: string;
    _internalId?: string;
    lap_overrides?: Record<string, string>;
    external_id?: string;
}

export interface StravaActivity {
    id: string; // our DB ID
    externalId: string;
    title: string;
    type: string;
    distance: number;
    duration: number; // moving time
    startDate: string;
    elevationGain: number;
    athlete_id?: string;
}
