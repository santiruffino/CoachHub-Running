'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { useCache } from '@/lib/context/CacheContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import {
    Activity as ActivityIcon,
    Calendar,
    Clock,
    TrendingUp,
    Heart,
    Footprints,
    Mountain,
    Zap,
    Award,
    ArrowLeft,
    Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeartRateZonesChart } from '../components/HeartRateZonesChart';
import { PaceZonesChart } from '../components/PaceZonesChart';
import { flattenWorkout, matchLapsToWorkout, MatchedLap } from '@/features/trainings/utils/workoutMatcher';
import { LinkWorkoutModal } from '@/features/trainings/components/LinkWorkoutModal';

// Dynamic import for ECharts to avoid SSR issues
const ActivityChart = dynamic(
    () => import('../components/ActivityChart').then(mod => ({ default: mod.ActivityChart })),
    { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center"><p>Loading chart...</p></div> }
);

interface SegmentEffort {
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

interface Split {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone?: number;
}

interface Lap {
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

interface ActivityDetail {
    id: number;
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
}

export default function ActivityDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [activity, setActivity] = useState<ActivityDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Feedback state
    const [feedback, setFeedback] = useState<{
        id?: string;
        rpe: number | null;
        comments: string;
    } | null>(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSaving, setFeedbackSaving] = useState(false);
    const [isAthlete, setIsAthlete] = useState(false);
    const [heartrateZones, setHeartrateZones] = useState<{ zones: Array<{ min: number; max: number }> } | null>(null);

    // Workout matching state
    const [matchedLaps, setMatchedLaps] = useState<MatchedLap[]>([]);
    const [workoutAssignment, setWorkoutAssignment] = useState<any>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const response = await api.get<ActivityDetail>(`/v2/activities/${id}`);
                setActivity(response.data);

                // Set whether the current viewer is the athlete (owner) or a coach
                setIsAthlete(response.data._viewerIsOwner || false);
            } catch (err: any) {
                console.error('Failed to fetch activity:', err);
                setError(err.response?.data?.error || 'Failed to load activity');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchActivity();
    }, [id]);

    // Fetch athlete profile for HR zones using cache
    const cache = useCache();
    useEffect(() => {
        const fetchHRZones = async () => {
            if (!activity?._ownerId) return;

            try {
                // Use cache with 5 minute TTL
                const data = await cache.getOrFetch(
                    `hrZones:${activity._ownerId}`,
                    async () => {
                        const response = await api.get(`/v2/users/${activity._ownerId}/details`);
                        return response.data?.athleteProfile?.hrZones || null;
                    },
                    5 * 60 * 1000 // 5 minutes
                );

                if (data) {
                    setHeartrateZones(data);
                }
            } catch (err) {
                console.error('Failed to fetch HR zones:', err);
            }
        };

        fetchHRZones();
    }, [activity?._ownerId]);

    // Fetch workout assignment and match laps
    useEffect(() => {
        const fetchAndMatchWorkout = async () => {
            if (!activity || !activity.laps || activity.laps.length === 0) return;

            try {
                // Get activity date
                const activityDate = activity.start_date.split('T')[0];

                // Fetch owner's assignments for that date
                const assignmentsRes = await api.get(`/v2/users/${activity._ownerId}/details`);
                const assignments = assignmentsRes.data?.assignments || [];

                // Find assignment matching this date
                const matchingAssignment = assignments.find((a: any) => {
                    // 1. Check for explicit link
                    // Use _internalId if available (for Strava activities where id is external_id)
                    // otherwise fallback to id (for manual activities if they use UUID as id)
                    const currentActivityId = activity._internalId || activity.id;
                    if (a.activity_id === currentActivityId) return true;

                    // 2. If assignment is linked to ANOTHER activity, ignore it
                    if (a.activity_id) return false;

                    // 3. Fallback to date match
                    const assignmentDate = a.scheduled_date?.split('T')[0];
                    return assignmentDate === activityDate;
                });

                if (matchingAssignment?.workout?.blocks) {
                    setWorkoutAssignment(matchingAssignment);

                    // Flatten workout and match laps
                    console.log('Matching workout blocks:', matchingAssignment.workout.blocks);
                    const flatSteps = flattenWorkout(matchingAssignment.workout.blocks);
                    console.log('Flat steps generated:', flatSteps);
                    const matched = matchLapsToWorkout(activity.laps, flatSteps);
                    console.log('Matched laps result:', matched);
                    setMatchedLaps(matched);
                } else {
                    // No workout found for this date
                    setMatchedLaps([]);
                }
            } catch (err) {
                console.error('Failed to fetch and match workout:', err);
                setMatchedLaps([]);
            }
        };

        fetchAndMatchWorkout();
    }, [activity]);

    // Fetch existing feedback
    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                setFeedbackLoading(true);
                const response = await api.get(`/v2/activities/${id}/feedback`);
                if (response.data) {
                    setFeedback({
                        id: response.data.id,
                        rpe: response.data.rpe,
                        comments: response.data.comments || '',
                    });
                } else {
                    // Initialize with default RPE of 5 (moderate)
                    setFeedback({ rpe: 5, comments: '' });
                }
            } catch (err: any) {
                console.error('Failed to fetch feedback:', err);
                // Initialize with default RPE of 5 (moderate)
                setFeedback({ rpe: 5, comments: '' });
            } finally {
                setFeedbackLoading(false);
            }
        };

        if (id && activity) fetchFeedback();
    }, [id, activity]);

    const handleSaveFeedback = async () => {
        if (!feedback) return;

        try {
            setFeedbackSaving(true);
            const response = await api.post(`/v2/activities/${id}/feedback`, {
                rpe: feedback.rpe,
                comments: feedback.comments,
            });
            setFeedback({
                id: response.data.id,
                rpe: response.data.rpe,
                comments: response.data.comments || '',
            });
        } catch (err: any) {
            console.error('Failed to save feedback:', err);
            showAlert('error', 'Failed to save feedback. Please try again.');
        } finally {
            setFeedbackSaving(false);
        }
    };

    const getRPELabel = (rpe: number | null): string => {
        if (!rpe) return 'Not rated';
        if (rpe <= 2) return 'Very Easy';
        if (rpe <= 4) return 'Easy';
        if (rpe <= 6) return 'Moderate';
        if (rpe <= 8) return 'Hard';
        return 'Maximum Effort';
    };

    const getRPEColor = (rpe: number | null): string => {
        if (!rpe) return 'bg-gray-500';
        if (rpe <= 2) return 'bg-blue-500';
        if (rpe <= 4) return 'bg-green-500';
        if (rpe <= 6) return 'bg-yellow-500';
        if (rpe <= 8) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatPace = (metersPerSecond: number): string => {
        const minutesPerKm = 1000 / (metersPerSecond * 60);
        const minutes = Math.floor(minutesPerKm);
        const seconds = Math.round((minutesPerKm - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatSpeed = (metersPerSecond: number): string => {
        const kmh = metersPerSecond * 3.6;
        return kmh.toFixed(1);
    };

    const getPaceZoneColor = (zone?: number): string => {
        if (!zone) return 'bg-gray-500';
        const colors = [
            'bg-blue-500',
            'bg-green-500',
            'bg-yellow-500',
            'bg-orange-500',
            'bg-red-500',
        ];
        return colors[zone - 1] || 'bg-gray-500';
    };

    // Helper functions to identify activity types
    const isRunning = (sportType: string): boolean => {
        return ['Run', 'TrailRun', 'VirtualRun'].includes(sportType);
    };

    const isCycling = (sportType: string): boolean => {
        return ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide'].includes(sportType);
    };

    const isWeightTraining = (sportType: string): boolean => {
        return ['WeightTraining', 'Workout', 'Crossfit'].includes(sportType);
    };

    // Determine HR zone from heart rate value
    const getHRZone = (hr: number): number => {
        if (!heartrateZones?.zones) return 0;

        for (let i = 0; i < heartrateZones.zones.length; i++) {
            const zone = heartrateZones.zones[i];
            // For the last zone, only check if HR is above minimum (no upper limit)
            if (i === heartrateZones.zones.length - 1) {
                if (hr >= zone.min) {
                    return i + 1;
                }
            } else {
                // For other zones, check if HR is within the range
                if (hr >= zone.min && hr < zone.max) {
                    return i + 1;
                }
            }
        }
        return 0;
    };

    // Get color class for HR zone
    const getHRZoneColor = (hr: number): string => {
        const zone = getHRZone(hr);
        const colors = [
            'bg-gray-400 text-gray-900',
            'bg-blue-500 text-white',
            'bg-green-500 text-white',
            'bg-yellow-500 text-gray-900',
            'bg-red-500 text-white',
        ];
        const colorClass = colors[zone - 1] || 'bg-gray-200 text-gray-900';
        return colorClass;
    };

    if (loading) {
        return (
            <div className="space-y-6 p-8">
                <Skeleton className="h-12 w-3/4" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !activity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                <ActivityIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Activity Not Found</h2>
                <p className="text-muted-foreground mb-6">{error || 'The activity you\'re looking for doesn\'t exist.'}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </div>
        );
    }

    const avgPace = formatPace(activity.average_speed);
    const distanceKm = (activity.distance / 1000).toFixed(2);

    return (
        <div className="space-y-12 p-4 md:p-8 max-w-[1400px] mx-auto pb-20 bg-background min-h-screen">
            <div className="flex items-center gap-2 mb-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>

            {/* Header section */}
            <div className="space-y-4">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {activity.sport_type} - {format(new Date(activity.start_date_local), 'MMMM d, yyyy').toUpperCase()}
                </p>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-medium text-foreground leading-tight max-w-5xl tracking-tight">
                    {activity.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 pt-2">
                    {/* Zone/Goal Badges - we can derive some basic ones from activity for now without mocking */}
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/50 text-accent-foreground">
                        {activity.average_heartrate ? `AVG HR: ${activity.average_heartrate.toFixed(0)} BPM` : 'GENERAL WORKOUT'}
                    </span>
                    {activity.suffer_score && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/50 text-accent-foreground">
                            SUFFER SCORE: {activity.suffer_score.toFixed(0)}
                        </span>
                    )}
                    {isAthlete && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsLinkModalOpen(true)} 
                            className="text-xs text-muted-foreground hover:text-foreground ml-2"
                        >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            {workoutAssignment ? 'Edit Link' : 'Link Workout'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Top Split View: Map/Chart (Left) & Core KPIs (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left: Map/Chart Container */}
                <div className="lg:col-span-8 bg-card rounded-3xl p-2 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <div className="h-[400px] lg:h-[500px] w-full bg-muted rounded-2xl overflow-hidden relative">
                        {/* We inject the ActivityChart in this premium container */}
                        {!isWeightTraining(activity.sport_type) ? (
                            <ActivityChart
                                activityId={id}
                                laps={activity.laps}
                                hrZones={heartrateZones?.zones}
                                isRunning={isRunning(activity.sport_type)}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center">
                                <ActivityIcon className="h-12 w-12 text-muted-foreground/60" />
                            </div>
                        )}
                    </div>
                    {/* Footer for map/chart */}
                    <div className="flex px-6 py-4 gap-6">
                        <div className="flex items-center gap-2 cursor-pointer text-foreground hover:text-primary">
                            <Mountain className="h-4 w-4" />
                            <span className="text-xs font-semibold tracking-wide uppercase">Terrain</span>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-semibold tracking-wide uppercase">Elevation Profile</span>
                        </div>
                    </div>
                </div>

                {/* Right: Core Metrics Column */}
                <div className="lg:col-span-4 bg-muted rounded-3xl p-8 flex flex-col justify-between">
                    <div className="space-y-8">
                        {/* Distance */}
                        {!isWeightTraining(activity.sport_type) && (
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">
                                    Distance
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-display font-medium text-foreground leading-none tracking-tighter">
                                        {distanceKm}
                                    </span>
                                    <span className="text-lg font-medium text-muted-foreground mb-1">km</span>
                                </div>
                            </div>
                        )}

                        <div className="w-full h-px bg-border/40" />

                        {/* Pace & Duration Stack */}
                        <div className="space-y-6">
                            {!isWeightTraining(activity.sport_type) && (
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                                        Average Pace
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-display font-medium text-foreground">
                                            {isRunning(activity.sport_type) ? avgPace : formatSpeed(activity.average_speed)}
                                        </span>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {isRunning(activity.sport_type) ? '/km' : 'km/h'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                                    Total Duration
                                </p>
                                <span className="text-3xl font-display font-medium text-foreground">
                                    {formatTime(activity.moving_time)}
                                </span>
                            </div>

                            {!isWeightTraining(activity.sport_type) && activity.total_elevation_gain > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                                        Elevation Gain
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-display font-medium text-foreground">
                                            +{activity.total_elevation_gain.toFixed(0)}
                                        </span>
                                        <span className="text-sm font-medium text-muted-foreground">m</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-12 space-y-3">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 shadow-[0_10px_20px_rgba(78,96,115,0.15)] rounded-xl font-medium">
                            Download Activity Report
                        </Button>
                        <Button variant="outline" className="w-full bg-card hover:bg-muted border-border/30 text-primary py-6 shadow-sm rounded-xl font-medium">
                            Share Analysis
                        </Button>
                    </div>
                </div>
            </div>

            {/* Zone Analysis Charts */}
            {!isWeightTraining(activity.sport_type) && (activity.laps?.length || activity.splits_metric) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    {/* Heart Rate Performance Block */}
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-foreground">Heart Rate Performance</h3>
                            {activity.average_heartrate && (
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Live Tracking Data</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-baseline mb-8">
                            <div>
                                <span className="text-5xl font-display font-medium text-foreground">
                                    {activity.average_heartrate?.toFixed(0) || '--'}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground ml-2 tracking-wide">BPM AVG</span>
                            </div>
                            {activity.max_heartrate && (
                                <span className="text-lg font-bold text-red-500 tracking-wide">
                                    {activity.max_heartrate.toFixed(0)} <span className="text-xs">MAX</span>
                                </span>
                            )}
                        </div>
                        
                        <div className="flex-1 -mx-4 -mb-4">
                            {activity.average_heartrate && heartrateZones?.zones && (
                                <HeartRateZonesChart
                                    laps={activity.laps}
                                    splits={activity.splits_metric}
                                    zones={heartrateZones.zones}
                                />
                            )}
                        </div>
                    </div>

                    {/* Intensity Distribution (Pace) Block */}
                    <div className="flex flex-col h-full pl-0 lg:pl-10 lg:border-l border-border/20 pt-8 lg:pt-0">
                        <h3 className="font-semibold text-foreground mb-8">Intensity Distribution</h3>
                        <div className="flex-1 -mx-4 -mb-4">
                            {isRunning(activity.sport_type) && (
                                <PaceZonesChart
                                    laps={activity.laps}
                                    splits={activity.splits_metric}
                                    isRunning={isRunning(activity.sport_type)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Splits & Laps - minimalist rewrite */}
            {!isWeightTraining(activity.sport_type) && (activity.laps?.length || activity.splits_metric || activity.splits_standard) && (
                <div className="bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-display font-medium text-foreground">Laps & Split Analysis</h2>
                        <Tabs defaultValue={activity.laps?.length ? "laps" : "metric"} className="w-auto">
                            <TabsList className="bg-muted p-1 rounded-xl">
                                {activity.laps && activity.laps.length > 0 && (
                                    <TabsTrigger value="laps" className="rounded-lg text-xs tracking-widest uppercase font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">Auto Laps</TabsTrigger>
                                )}
                                {activity.splits_metric && (
                                    <TabsTrigger value="metric" className="rounded-lg text-xs tracking-widest uppercase font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">KM Splits</TabsTrigger>
                                )}
                            </TabsList>
                        </Tabs>
                    </div>
                    
                    <div>
                        <Tabs defaultValue={activity.laps?.length ? "laps" : "metric"}>
                            {/* Laps Tab */}
                            {activity.laps && activity.laps.length > 0 && (
                                <TabsContent value="laps" className="mt-0 outline-none">
                                    <div className="overflow-x-auto">
                                        <Table className="w-full">
                                            <TableHeader>
                                                <TableRow className="border-b border-muted hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 pl-0">Lap</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Time</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Distance</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Avg Pace</TableHead>
                                                    {!!activity.laps[0]?.average_heartrate && (
                                                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Avg HR</TableHead>
                                                    )}
                                                    {!!activity.laps[0]?.average_cadence && (
                                                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Cadence</TableHead>
                                                    )}
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 text-right pr-0">Elev Gain</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {activity.laps.map((lap, idx) => {
                                                const matchedLap = matchedLaps.find(m => m.lapIndex === idx);
                                                const stepTypeColors: Record<string, string> = {
                                                    warmup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                                    active: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                                                    recovery: 'bg-green-500/10 text-green-500 border-green-500/20',
                                                    cooldown: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                                                    other: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
                                                };

                                                return (
                                                    <TableRow key={lap.id}>
                                                        <TableCell className="font-medium">{lap.lap_index}</TableCell>
                                                        <TableCell>{(lap.distance / 1000).toFixed(2)} km</TableCell>
                                                        <TableCell>{formatTime(lap.moving_time)}</TableCell>
                                                        <TableCell>{formatPace(lap.average_speed)}</TableCell>
                                                        <TableCell>{lap.total_elevation_gain.toFixed(1)} m</TableCell>
                                                        {!!activity.laps![0]?.average_heartrate && (
                                                            <TableCell>
                                                                {lap.average_heartrate ? (
                                                                    <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(lap.average_heartrate)}`}>
                                                                        {lap.average_heartrate.toFixed(0)} bpm
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        {!!activity.laps![0]?.average_cadence && (
                                                            <TableCell>
                                                                {lap.average_cadence ? (
                                                                    <span>{lap.average_cadence.toFixed(0)} spm</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        <TableCell>
                                                            {matchedLap ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`${stepTypeColors[matchedLap.stepType]} border`}
                                                                >
                                                                    {matchedLap.stepLabel}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                </TabsContent>
                            )}

                            {/* Metric Splits Tab */}
                            {activity.splits_metric && (
                                <TabsContent value="metric" className="mt-0 outline-none">
                                    <div className="overflow-x-auto">
                                        <Table className="w-full">
                                            <TableHeader>
                                                <TableRow className="border-b border-muted hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 pl-0">Split</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Distance</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Time</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Pace</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Elevation</TableHead>
                                                    {!!activity.splits_metric[0]?.average_heartrate && (
                                                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Avg HR</TableHead>
                                                    )}
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 text-right pr-0">Zone</TableHead>
                                                </TableRow>
                                            </TableHeader>

                                        <TableBody>
                                            {activity.splits_metric.map((split) => (
                                                <TableRow key={split.split}>
                                                    <TableCell className="font-medium">{split.split}</TableCell>
                                                    <TableCell>{(split.distance / 1000).toFixed(2)} km</TableCell>
                                                    <TableCell>{formatTime(split.moving_time)}</TableCell>
                                                    <TableCell>{formatPace(split.average_speed)}</TableCell>
                                                    <TableCell>{split.elevation_difference > 0 ? '+' : ''}{split.elevation_difference.toFixed(1)} m</TableCell>
                                                    {!!activity.splits_metric![0]?.average_heartrate && (
                                                        <TableCell>
                                                            {split.average_heartrate ? (
                                                                <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(split.average_heartrate)}`}>
                                                                    {split.average_heartrate.toFixed(0)} bpm
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className={`h-2 w-12 rounded ${getPaceZoneColor(split.pace_zone)}`} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            )}

                            {/* Standard Splits Tab */}
                            {activity.splits_standard && (
                                <TabsContent value="standard" className="mt-0 outline-none">
                                    <div className="overflow-x-auto">
                                        <Table className="w-full">
                                            <TableHeader>
                                                <TableRow className="border-b border-muted hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 pl-0">Split</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Distance</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Time</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">Pace</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 text-right pr-0">Elevation</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {activity.splits_standard.map((split) => (
                                                <TableRow key={split.split} className="border-b border-muted hover:bg-transparent">
                                                    <TableCell className="font-medium pl-0">{split.split}</TableCell>
                                                    <TableCell>{(split.distance / 1609.34).toFixed(2)} mi</TableCell>
                                                    <TableCell>{formatTime(split.moving_time)}</TableCell>
                                                    <TableCell>{formatPace(split.average_speed)}</TableCell>
                                                    <TableCell className="text-right pr-0">{split.elevation_difference > 0 ? '+' : ''}{split.elevation_difference.toFixed(1)} m</TableCell>
                                                </TableRow>
                                            ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            )}
                        </Tabs>

                        {/* HR Zone Legend */}
                        {heartrateZones?.zones && activity.average_heartrate && (
                            <div className="mt-8 pt-6 border-t border-muted">
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-4">Heart Rate Zones Reference</p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40"></span>
                                        <span className="text-xs font-medium text-foreground">Z1 <span className="text-muted-foreground ml-1">({heartrateZones.zones[0]?.min}-{heartrateZones.zones[0]?.max})</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                        <span className="text-xs font-medium text-foreground">Z2 <span className="text-muted-foreground ml-1">({heartrateZones.zones[1]?.min}-{heartrateZones.zones[1]?.max})</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                                        <span className="text-xs font-medium text-foreground">Z3 <span className="text-muted-foreground ml-1">({heartrateZones.zones[2]?.min}-{heartrateZones.zones[2]?.max})</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                                        <span className="text-xs font-medium text-foreground">Z4 <span className="text-muted-foreground ml-1">({heartrateZones.zones[3]?.min}-{heartrateZones.zones[3]?.max})</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                        <span className="text-xs font-medium text-foreground">Z5 <span className="text-muted-foreground ml-1">({heartrateZones.zones[4]?.min}-{heartrateZones.zones[4]?.max})</span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Segment Efforts */}
            {!isWeightTraining(activity.sport_type) && activity.segment_efforts && activity.segment_efforts.length > 0 && (
                <div className="bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <h2 className="text-xl font-display font-medium text-foreground mb-8">Segment Efforts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activity.segment_efforts.map((effort) => (
                            <div key={effort.id} className="p-6 bg-background rounded-2xl hover:bg-muted transition-colors">
                                <h4 className="font-semibold text-foreground mb-4 truncate">{effort.segment.name}</h4>
                                <div className="grid grid-cols-2 gap-y-4 text-sm mb-4">
                                    <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">Time</p>
                                        <p className="font-display font-medium text-foreground text-xl">{formatTime(effort.elapsed_time)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">Pace</p>
                                        <p className="font-display font-medium text-foreground text-xl">{formatPace(effort.distance / (effort.moving_time / 3600))}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">Distance & Area</p>
                                        <p className="text-primary font-medium">
                                            {(effort.distance / 1000).toFixed(2)} km {effort.segment.city && `• ${effort.segment.city}`}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-border/40">
                                    {effort.pr_rank && (
                                        <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest bg-yellow-100 text-yellow-800">
                                            PR #{effort.pr_rank}
                                        </span>
                                    )}
                                    {effort.kom_rank && (
                                        <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest bg-red-100 text-red-800">
                                            KOM #{effort.kom_rank}
                                        </span>
                                    )}
                                    {effort.achievements.map((achievement, idx) => (
                                        <span key={idx} className="px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest bg-blue-100 text-blue-800 flex items-center gap-1">
                                            <Award className="h-3 w-3" />
                                            {achievement.type}
                                        </span>
                                    ))}
                                    {!effort.pr_rank && !effort.kom_rank && effort.achievements.length === 0 && (
                                        <span className="text-xs text-muted-foreground/70 font-medium tracking-wide uppercase">General Effort</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Feedback */}
            {feedback !== null && !feedbackLoading && (
                <div className="bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted max-w-6xl">
                    <h2 className="text-xl font-display font-medium text-foreground mb-8">Activity Feedback</h2>
                    <div className="flex flex-col space-y-8">
                        {isAthlete ? (
                            <>
                                {/* RPE Selector */}
                                <div>
                                    <Label htmlFor="rpe" className="text-xs tracking-widest uppercase font-semibold text-muted-foreground mb-4 block">Rate of Perceived Exertion</Label>
                                    <div className="flex items-center gap-6">
                                        <Slider
                                            id="rpe"
                                            min={1}
                                            max={10}
                                            step={1}
                                            value={[feedback.rpe || 5]}
                                            onValueChange={(value) => setFeedback({ ...feedback, rpe: value[0] })}
                                            className="flex-1"
                                        />
                                        <div className="bg-muted w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-muted">
                                            <p className="text-3xl font-display font-medium text-foreground">{feedback.rpe || 5}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4">
                                        <div className={`h-2 flex-1 rounded-full ${getRPEColor(feedback.rpe || 5)} opacity-80`} />
                                        <p className="text-sm font-medium text-primary min-w-[80px] text-right">
                                            {getRPELabel(feedback.rpe || 5)}
                                        </p>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div>
                                    <Label htmlFor="comments" className="text-xs tracking-widest uppercase font-semibold text-muted-foreground mb-3 block">Athlete Notes</Label>
                                    <Textarea
                                        id="comments"
                                        placeholder="How did this workout feel? Any notes for your coach..."
                                        value={feedback.comments}
                                        onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                                        rows={4}
                                        className="bg-muted border-muted rounded-xl focus-visible:ring-1 focus-visible:ring-primary resize-none text-foreground"
                                    />
                                </div>

                                {/* Save Button */}
                                <div>
                                    <Button
                                        onClick={handleSaveFeedback}
                                        disabled={feedbackSaving}
                                        className="bg-foreground hover:bg-foreground/90 text-background px-8 py-6 rounded-xl font-medium shadow-md transition-all"
                                    >
                                        {feedbackSaving ? 'Saving...' : feedback.id ? 'Update Feedback' : 'Save Feedback'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Coach View - Read Only */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div>
                                        <Label className="text-[10px] tracking-widest uppercase font-semibold text-muted-foreground pb-4 block">Perceived Exertion (RPE)</Label>
                                        {feedback.rpe ? (
                                            <div className="flex items-center gap-4 border border-muted rounded-2xl p-4 bg-background">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-muted flex items-center justify-center">
                                                    <span className="text-2xl font-display font-medium text-foreground">{feedback.rpe}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-foreground">{getRPELabel(feedback.rpe)}</p>
                                                    <div className={`h-1.5 w-full rounded-full mt-2 ${getRPEColor(feedback.rpe)}`} />
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic px-4">No exertion recorded.</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label className="text-[10px] tracking-widest uppercase font-semibold text-muted-foreground pb-4 block">Athlete Notes</Label>
                                        {feedback.comments ? (
                                            <div className="bg-background border border-muted rounded-2xl p-6 h-full min-h-[100px]">
                                                <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{feedback.comments}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic px-4">No notes provided by the athlete.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* Link Workout Modal */}
            {activity && (
                <LinkWorkoutModal
                    isOpen={isLinkModalOpen}
                    onClose={() => setIsLinkModalOpen(false)}
                    activityId={id}
                    activityTitle={activity.name}
                    onLinkSuccess={() => {
                        setIsLinkModalOpen(false);
                        // Trigger re-match logic by forcing effect to run? 
                        // The simplest way is to fetch details again or just the assignments.
                        // Ideally we extract fetchAndMatchWorkout. 
                        // For now, refreshing the page is a crude but effective fallback if we don't want to refactor.
                        // Or we can manually trigger the effect by adding a counter.
                        window.location.reload();
                    }}
                />
            )}

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </div>
    );
}
