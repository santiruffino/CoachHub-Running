'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeartRateZonesChart } from '../components/HeartRateZonesChart';
import { PaceZonesChart } from '../components/PaceZonesChart';

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

    // Fetch athlete profile for HR zones
    useEffect(() => {
        const fetchHRZones = async () => {
            if (!activity?._ownerId) return;

            try {
                const response = await api.get(`/v2/users/${activity._ownerId}/details`);
                if (response.data?.athleteProfile?.hrZones) {
                    setHeartrateZones(response.data.athleteProfile.hrZones);
                }
            } catch (err) {
                console.error('Failed to fetch HR zones:', err);
            }
        };

        fetchHRZones();
    }, [activity?._ownerId]);

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
            alert('Failed to save feedback. Please try again.');
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
        <div className="space-y-6 p-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-3xl font-bold">{activity.name}</h1>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(activity.start_date_local), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(activity.start_date_local), 'p')}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="secondary">{activity.sport_type}</Badge>
                        {activity.device_name && (
                            <Badge variant="outline">{activity.device_name}</Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-4">
                    {activity.achievement_count > 0 && (
                        <div className="text-center">
                            <Award className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                            <p className="text-sm font-semibold">{activity.achievement_count}</p>
                            <p className="text-xs text-muted-foreground">Achievements</p>
                        </div>
                    )}
                    {activity.kudos_count > 0 && (
                        <div className="text-center">
                            <Heart className="h-6 w-6 text-red-500 mx-auto mb-1" />
                            <p className="text-sm font-semibold">{activity.kudos_count}</p>
                            <p className="text-xs text-muted-foreground">Kudos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Distance</p>
                        </div>
                        <p className="text-2xl font-bold">{distanceKm} km</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Time</p>
                        </div>
                        <p className="text-2xl font-bold">{formatTime(activity.moving_time)}</p>
                        <p className="text-xs text-muted-foreground">Elapsed: {formatTime(activity.elapsed_time)}</p>
                    </CardContent>
                </Card>

                {/* Pace/Speed Card - conditional based on activity type */}
                {!isWeightTraining(activity.sport_type) && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Footprints className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    {isRunning(activity.sport_type) ? 'Avg Pace' : 'Avg Speed'}
                                </p>
                            </div>
                            <p className="text-2xl font-bold">
                                {isRunning(activity.sport_type)
                                    ? `${avgPace} /km`
                                    : `${formatSpeed(activity.average_speed)} km/h`}
                            </p>
                            {isCycling(activity.sport_type) && (
                                <p className="text-xs text-muted-foreground">
                                    Max: {formatSpeed(activity.max_speed)} km/h
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Elevation - hide for WeightTraining */}
                {!isWeightTraining(activity.sport_type) && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Mountain className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Elevation</p>
                            </div>
                            <p className="text-2xl font-bold">{activity.total_elevation_gain.toFixed(0)} m</p>
                        </CardContent>
                    </Card>
                )}

                {activity.average_heartrate && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Heart className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Avg HR</p>
                            </div>
                            <p className="text-2xl font-bold">{activity.average_heartrate.toFixed(0)} bpm</p>
                            {activity.max_heartrate && (
                                <p className="text-xs text-muted-foreground">Max: {activity.max_heartrate.toFixed(0)}</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activity.average_cadence && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Avg Cadence</p>
                            </div>
                            <p className="text-2xl font-bold">
                                {activity.average_cadence.toFixed(0)} {isCycling(activity.sport_type) ? 'rpm' : 'spm'}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Power metrics - prioritize for cycling */}
                {activity.average_watts && isCycling(activity.sport_type) && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Avg Power</p>
                            </div>
                            <p className="text-2xl font-bold">{activity.average_watts.toFixed(0)} W</p>
                            {activity.max_watts && (
                                <p className="text-xs text-muted-foreground">Max: {activity.max_watts.toFixed(0)} W</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activity.calories && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Calories</p>
                            </div>
                            <p className="text-2xl font-bold">{activity.calories.toFixed(0)}</p>
                        </CardContent>
                    </Card>
                )}

                {activity.suffer_score && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Suffer Score</p>
                            </div>
                            <p className="text-2xl font-bold">{activity.suffer_score.toFixed(0)}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Map Section */}
            {activity.map?.summary_polyline && (
                <Card>
                    <CardHeader>
                        <CardTitle>Route Map</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full h-96 bg-muted rounded-lg overflow-hidden">
                            <img
                                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/polyline(${encodeURIComponent(activity.map.summary_polyline)})/auto/800x400@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`}
                                alt="Activity route map"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Activity Dynamics Chart */}
            {!isWeightTraining(activity.sport_type) && (
                <ActivityChart
                    activityId={id}
                    laps={activity.laps}
                    hrZones={heartrateZones?.zones}
                    isRunning={isRunning(activity.sport_type)}
                />
            )}

            {/* Zone Analysis Charts */}
            {!isWeightTraining(activity.sport_type) && (activity.laps?.length || activity.splits_metric) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Heart Rate Zones */}
                    {activity.average_heartrate && heartrateZones?.zones && (
                        <HeartRateZonesChart
                            laps={activity.laps}
                            splits={activity.splits_metric}
                            zones={heartrateZones.zones}
                        />
                    )}

                    {/* Pace Zones - only for running */}
                    {isRunning(activity.sport_type) && (
                        <PaceZonesChart
                            laps={activity.laps}
                            splits={activity.splits_metric}
                            isRunning={isRunning(activity.sport_type)}
                        />
                    )}
                </div>
            )}

            {/* Splits & Laps - hide for weight training */}
            {!isWeightTraining(activity.sport_type) && (activity.laps?.length || activity.splits_metric || activity.splits_standard) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Splits & Laps</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue={activity.laps?.length ? "laps" : "metric"}>
                            <TabsList className="grid w-full max-w-md grid-cols-3">
                                {activity.laps && activity.laps.length > 0 && (
                                    <TabsTrigger value="laps">Laps</TabsTrigger>
                                )}
                                {activity.splits_metric && (
                                    <TabsTrigger value="metric">Splits (km)</TabsTrigger>
                                )}
                                {activity.splits_standard && (
                                    <TabsTrigger value="standard">Splits (mi)</TabsTrigger>
                                )}
                            </TabsList>

                            {/* Laps Tab */}
                            {activity.laps && activity.laps.length > 0 && (
                                <TabsContent value="laps">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Lap</TableHead>
                                                <TableHead>Distance</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Avg Pace</TableHead>
                                                <TableHead>Elevation</TableHead>
                                                {activity.laps[0]?.average_heartrate && (
                                                    <TableHead>Avg HR</TableHead>
                                                )}
                                                {activity.laps[0]?.average_cadence && (
                                                    <TableHead>Avg Cadence</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activity.laps.map((lap) => (
                                                <TableRow key={lap.id}>
                                                    <TableCell className="font-medium">{lap.lap_index}</TableCell>
                                                    <TableCell>{(lap.distance / 1000).toFixed(2)} km</TableCell>
                                                    <TableCell>{formatTime(lap.moving_time)}</TableCell>
                                                    <TableCell>{formatPace(lap.average_speed)}</TableCell>
                                                    <TableCell>{lap.total_elevation_gain.toFixed(1)} m</TableCell>
                                                    {lap.average_heartrate && (
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(lap.average_heartrate)}`}>
                                                                {lap.average_heartrate.toFixed(0)} bpm
                                                            </span>
                                                        </TableCell>
                                                    )}
                                                    {lap.average_cadence && (
                                                        <TableCell>{lap.average_cadence.toFixed(0)} spm</TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            )}

                            {/* Metric Splits Tab */}
                            {activity.splits_metric && (
                                <TabsContent value="metric">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Split</TableHead>
                                                <TableHead>Distance</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Pace</TableHead>
                                                <TableHead>Elevation</TableHead>
                                                {activity.splits_metric[0]?.average_heartrate && (
                                                    <TableHead>Avg HR</TableHead>
                                                )}
                                                <TableHead>Zone</TableHead>
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
                                                    {split.average_heartrate && (
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(split.average_heartrate)}`}>
                                                                {split.average_heartrate.toFixed(0)} bpm
                                                            </span>
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className={`h-2 w-12 rounded ${getPaceZoneColor(split.pace_zone)}`} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            )}

                            {/* Standard Splits Tab */}
                            {activity.splits_standard && (
                                <TabsContent value="standard">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Split</TableHead>
                                                <TableHead>Distance</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Pace</TableHead>
                                                <TableHead>Elevation</TableHead>
                                                {activity.splits_standard[0]?.average_heartrate && (
                                                    <TableHead>Avg HR</TableHead>
                                                )}
                                                <TableHead>Zone</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activity.splits_standard.map((split) => (
                                                <TableRow key={split.split}>
                                                    <TableCell className="font-medium">{split.split}</TableCell>
                                                    <TableCell>{(split.distance / 1609.34).toFixed(2)} mi</TableCell>
                                                    <TableCell>{formatTime(split.moving_time)}</TableCell>
                                                    <TableCell>{formatPace(split.average_speed)}</TableCell>
                                                    <TableCell>{split.elevation_difference > 0 ? '+' : ''}{split.elevation_difference.toFixed(1)} m</TableCell>
                                                    {split.average_heartrate && (
                                                        <TableCell>
                                                            <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(split.average_heartrate)}`}>
                                                                {split.average_heartrate.toFixed(0)} bpm
                                                            </span>
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className={`h-2 w-12 rounded ${getPaceZoneColor(split.pace_zone)}`} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            )}
                        </Tabs>

                        {/* HR Zone Legend */}
                        {heartrateZones?.zones && activity.average_heartrate && (
                            <div className="mt-6 pt-4 border-t">
                                <p className="text-sm font-medium text-muted-foreground mb-3">Heart Rate Zones:</p>
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded font-medium bg-gray-400 text-gray-900">Z1</span>
                                        <span className="text-sm text-muted-foreground">Recovery ({heartrateZones.zones[0]?.min}-{heartrateZones.zones[0]?.max} bpm)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded font-medium bg-blue-500 text-white">Z2</span>
                                        <span className="text-sm text-muted-foreground">Endurance ({heartrateZones.zones[1]?.min}-{heartrateZones.zones[1]?.max} bpm)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded font-medium bg-green-500 text-white">Z3</span>
                                        <span className="text-sm text-muted-foreground">Tempo ({heartrateZones.zones[2]?.min}-{heartrateZones.zones[2]?.max} bpm)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded font-medium bg-yellow-500 text-gray-900">Z4</span>
                                        <span className="text-sm text-muted-foreground">Threshold ({heartrateZones.zones[3]?.min}-{heartrateZones.zones[3]?.max} bpm)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded font-medium bg-red-500 text-white">Z5</span>
                                        <span className="text-sm text-muted-foreground">VO2 Max ({heartrateZones.zones[4]?.min}-{heartrateZones.zones[4]?.max} bpm)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Segment Efforts - hide for weight training */}
            {!isWeightTraining(activity.sport_type) && activity.segment_efforts && activity.segment_efforts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Segment Efforts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activity.segment_efforts.map((effort) => (
                                <div key={effort.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{effort.segment.name}</h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span>{(effort.distance / 1000).toFixed(2)} km</span>
                                            <span>{formatTime(effort.elapsed_time)}</span>
                                            {effort.average_heartrate && (
                                                <span className="flex items-center gap-1">
                                                    <Heart className="h-3 w-3" />
                                                    {effort.average_heartrate.toFixed(0)} bpm
                                                </span>
                                            )}
                                            {effort.segment.city && (
                                                <span>{effort.segment.city}, {effort.segment.country}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {effort.pr_rank && (
                                            <Badge variant="secondary">
                                                PR #{effort.pr_rank}
                                            </Badge>
                                        )}
                                        {effort.kom_rank && (
                                            <Badge variant="destructive">
                                                KOM #{effort.kom_rank}
                                            </Badge>
                                        )}
                                        {effort.achievements.map((achievement, idx) => (
                                            <Badge key={idx} variant="default">
                                                <Award className="h-3 w-3 mr-1" />
                                                {achievement.type.toUpperCase()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Activity Feedback */}
            {feedback !== null && !feedbackLoading && (
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Feedback</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isAthlete ? (
                            <>
                                {/* RPE Selector */}
                                <div className="space-y-3">
                                    <Label htmlFor="rpe">Rate of Perceived Exertion (RPE)</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider
                                            id="rpe"
                                            min={1}
                                            max={10}
                                            step={1}
                                            value={[feedback.rpe || 5]}
                                            onValueChange={(value) => setFeedback({ ...feedback, rpe: value[0] })}
                                            className="flex-1"
                                        />
                                        <div className="min-w-[40px] text-center">
                                            <p className="text-2xl font-bold">{feedback.rpe || 5}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-full rounded ${getRPEColor(feedback.rpe || 5)}`} />
                                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                                            {getRPELabel(feedback.rpe || 5)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        1-2: Very Easy | 3-4: Easy | 5-6: Moderate | 7-8: Hard | 9-10: Maximum Effort
                                    </p>
                                </div>

                                {/* Comments */}
                                <div className="space-y-2">
                                    <Label htmlFor="comments">Comments</Label>
                                    <Textarea
                                        id="comments"
                                        placeholder="How did this workout feel? Any notes for your coach..."
                                        value={feedback.comments}
                                        onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                                        rows={4}
                                    />
                                </div>

                                {/* Save Button */}
                                <Button
                                    onClick={handleSaveFeedback}
                                    disabled={feedbackSaving}
                                    className="w-full sm:w-auto"
                                >
                                    {feedbackSaving ? 'Saving...' : feedback.id ? 'Update Feedback' : 'Save Feedback'}
                                </Button>
                            </>
                        ) : (
                            <>
                                {/* Coach View - Read Only */}
                                <div className="space-y-3">
                                    <div>
                                        <Label>Rate of Perceived Exertion (RPE)</Label>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className={`h-3 flex-1 rounded ${getRPEColor(feedback.rpe)}`} />
                                            <Badge variant="secondary" className="text-lg">
                                                {feedback.rpe || 'N/A'}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {getRPELabel(feedback.rpe)}
                                        </p>
                                    </div>

                                    {feedback.comments && (
                                        <div>
                                            <Label>Athlete Comments</Label>
                                            <div className="mt-2 p-3 bg-muted rounded-md">
                                                <p className="text-sm whitespace-pre-wrap">{feedback.comments}</p>
                                            </div>
                                        </div>
                                    )}

                                    {!feedback.rpe && !feedback.comments && (
                                        <p className="text-sm text-muted-foreground italic">
                                            No feedback provided yet.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
