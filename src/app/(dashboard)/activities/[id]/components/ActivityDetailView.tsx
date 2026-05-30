'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import api from '@/lib/axios';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import {
    Activity as ActivityIcon,
    Link as LinkIcon,
    Calendar,
    Heart
} from 'lucide-react';
import { ZoneComplianceCard } from '@/app/(dashboard)/activities/components/ZoneComplianceCard';
import { ActivityChartsTabs } from '@/app/(dashboard)/activities/components/ActivityChartsTabs';
import { HrZonesPieChart } from '@/app/(dashboard)/activities/components/HrZonesPieChart';
import { flattenWorkout, matchLapsToWorkout, MatchedLap, RawBlock } from '@/features/trainings/utils/workoutMatcher';
import { LinkWorkoutModal } from '@/features/trainings/components/LinkWorkoutModal';
import { ActivityDetail } from '@/interfaces/activity';

interface ComplianceData {
    compliance_score: number;
    is_violation: boolean;
    violation_details: {
        targets: number[];
        distribution: Array<{
            min: number;
            max: number;
            time: number;
        }>;
    };
}

interface WorkoutAssignment {
    activity_id?: string | null;
    scheduled_date?: string;
    scheduledDate?: string;
    workout?: {
        blocks?: RawBlock[];
    };
    training?: {
        type?: string;
    };
}

interface ActivityDetailViewProps {
    id: string;
    initialActivity: ActivityDetail;
    initialCompliance: ComplianceData | null;
    initialHRZones: { zones: Array<{ min: number; max: number }> } | null;
    initialAssignments: WorkoutAssignment[];
    initialFeedback: { id?: string; rpe: number | null; comments: string | null } | null;
}

export function ActivityDetailView({
    id,
    initialActivity,
    initialCompliance,
    initialHRZones,
    initialAssignments,
    initialFeedback
}: ActivityDetailViewProps) {
    const t = useTranslations('activities.detail');
    const tDashboard = useTranslations('dashboard');
    const intlFormat = useFormatter();

    const [activity, setActivity] = useState<ActivityDetail>(initialActivity);
    const [compliance] = useState<ComplianceData | null>(initialCompliance);
    const [heartrateZones] = useState(initialHRZones);
    const [feedback, setFeedback] = useState(initialFeedback ? { ...initialFeedback, comments: initialFeedback.comments || '' } : { rpe: 5, comments: '' });
    const [feedbackSaving, setFeedbackSaving] = useState(false);

    const [matchedLaps, setMatchedLaps] = useState<MatchedLap[]>([]);
    const [workoutAssignment, setWorkoutAssignment] = useState<WorkoutAssignment | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const internalId = activity._internalId || id;
    const isAthlete = activity._viewerIsOwner || false;

    // Fetch full activity from API if laps are missing (Strava data with laps)
    useEffect(() => {
        if (activity.laps && activity.laps.length > 0) return;

        const fetchFullActivity = async () => {
            try {
                const response = await api.get(`/v2/activities/${internalId}`);
                const fullActivity = response.data;
                if (fullActivity?.laps && fullActivity.laps.length > 0) {
                    setActivity(prev => ({
                        ...prev,
                        laps: fullActivity.laps,
                        splits_metric: fullActivity.splits_metric ?? prev.splits_metric,
                        splits_standard: fullActivity.splits_standard ?? prev.splits_standard,
                    }));
                }
            } catch (error) {
                appLogger.error('Failed to fetch full activity:', error);
            }
        };

        fetchFullActivity();
    }, [internalId, activity.laps]);

    // Workout matching logic
    useEffect(() => {
        if (!activity || !activity.laps || activity.laps.length === 0) return;

        const activityDate = activity.start_date.split('T')[0];
        const matchingAssignment = initialAssignments.find((a: WorkoutAssignment) => {
            const currentActivityId = activity._internalId || String(activity.id);
            if (a.activity_id === currentActivityId) return true;
            if (a.activity_id) return false;
            const dateValue = a.scheduled_date || a.scheduledDate;
            return dateValue?.split('T')[0] === activityDate;
        });

        if (matchingAssignment?.workout?.blocks) {
            setWorkoutAssignment(matchingAssignment);
            const flatSteps = flattenWorkout(matchingAssignment.workout.blocks);
            const matched = matchLapsToWorkout(
                activity.laps,
                flatSteps,
                activity.sport_type,
                matchingAssignment.training?.type || 'RUNNING'
            );
            setMatchedLaps(matched);
        }
    }, [activity, initialAssignments]);

    const handleSaveFeedback = async () => {
        try {
            setFeedbackSaving(true);
            const response = await api.post(`/v2/activities/${internalId}/feedback`, {
                rpe: feedback.rpe,
                comments: feedback.comments,
            });
            setFeedback({
                id: response.data.id,
                rpe: response.data.rpe,
                comments: response.data.comments || '',
            });
        } catch (error: unknown) {
            appLogger.error('Failed to save feedback:', error);
            showAlert('error', t('errorSaveFeedback'));
        } finally {
            setFeedbackSaving(false);
        }
    };

    const getRPELabel = (rpe: number | null): string => {
        if (!rpe) return t('rpe.notRated');
        if (rpe <= 2) return t('rpe.veryEasy');
        if (rpe <= 4) return t('rpe.easy');
        if (rpe <= 6) return t('rpe.moderate');
        if (rpe <= 8) return t('rpe.hard');
        return t('rpe.maximumEffort');
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.round(seconds % 60);
        if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatPace = (metersPerSecond: number): string => {
        const minutesPerKm = 1000 / (metersPerSecond * 60);
        const minutes = Math.floor(minutesPerKm);
        const seconds = Math.round((minutesPerKm - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatSpeed = (metersPerSecond: number): string => (metersPerSecond * 3.6).toFixed(1);

    const isRunning = (sportType: string) => ['Run', 'TrailRun', 'VirtualRun'].includes(sportType);
    const isWeightTraining = (sportType: string) => ['WeightTraining', 'Workout', 'Crossfit'].includes(sportType);

    const getSportTranslation = (sportType: string) => {
        if (isRunning(sportType)) return tDashboard('trainingTypes.RUNNING');
        if (isWeightTraining(sportType)) return tDashboard('trainingTypes.STRENGTH');
        if (['Ride', 'VirtualRide', 'EBikeRide'].includes(sportType)) return tDashboard('trainingTypes.CYCLING');
        if (['Swim'].includes(sportType)) return tDashboard('trainingTypes.SWIMMING');
        return sportType;
    };

    const getHRZone = (hr: number): number => {
        if (!heartrateZones?.zones) return 0;
        for (let i = 0; i < heartrateZones.zones.length; i++) {
            const zone = heartrateZones.zones[i];
            if (i === heartrateZones.zones.length - 1) {
                if (hr >= zone.min) return i + 1;
            } else {
                if (hr >= zone.min && hr < zone.max) return i + 1;
            }
        }
        return 0;
    };

    const getHRZoneColor = (hr: number): string => {
        const zone = getHRZone(hr);
        const colors = ['bg-gray-400 text-gray-900', 'bg-blue-500 text-white', 'bg-green-500 text-white', 'bg-yellow-500 text-gray-900', 'bg-red-500 text-white'];
        return colors[zone - 1] || 'bg-gray-200 text-gray-900';
    };

    const updateLapOverrides = async (overrideUpdates: Record<string, string>) => {
        try {
            const mergedOverrides = {
                ...(activity.lap_overrides || {}),
                ...overrideUpdates,
            };

            await api.patch(`/v2/activities/${internalId}`, { lapOverrides: mergedOverrides });
            setActivity(prev => ({
                ...prev,
                lap_overrides: mergedOverrides,
            }));
        } catch (error) {
            appLogger.error('Failed to update lap override:', error);
            showAlert('error', t('errorSaveFeedback'));
        }
    };

    const handleOverrideStepType = async (lapIndex: number, newStepType: string) => {
        await updateLapOverrides({ [lapIndex]: newStepType });
    };

    const handleBulkOverrideStepType = async (lapIndices: number[], newStepType: string) => {
        if (!lapIndices.length) return;

        const updates = lapIndices.reduce<Record<string, string>>((acc, lapIndex) => {
            acc[lapIndex] = newStepType;
            return acc;
        }, {});

        await updateLapOverrides(updates);
    };

    const avgPace = formatPace(activity.average_speed);
    const distanceKm = (activity.distance / 1000).toFixed(2);
    const sessionType = workoutAssignment?.training?.type;

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-endurix-orange flex items-center justify-center">
                                <ActivityIcon className="h-5 w-5 text-white" />
                            </div>
                            <span
                                className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {getSportTranslation(activity.sport_type)}
                                {sessionType && ` • ${sessionType}`}
                            </span>
                        </div>

                        <h1
                            className="font-bold text-endurix-black dark:text-foreground text-4xl lg:text-5xl xl:text-6xl leading-[1.05] tracking-tight uppercase"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {activity.name}
                        </h1>

                        <div className="flex flex-wrap items-center gap-3">
                            <span
                                className="inline-flex items-center gap-1.5 border border-endurix-black/20 dark:border-border px-3 py-1.5"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                <Calendar className="h-3 w-3 text-endurix-black/50 dark:text-muted-foreground" />
                                <span className="text-[9px] font-medium text-endurix-black dark:text-foreground tracking-wider uppercase">
                                    {(() => { const d = new Date(activity.start_date_local ?? activity.start_date); return isNaN(d.getTime()) ? '' : intlFormat.dateTime(d, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(); })()}
                                </span>
                            </span>
                            {!isWeightTraining(activity.sport_type) && activity.average_heartrate && (
                                <span
                                    className="inline-flex items-center gap-1.5 border border-endurix-black/20 dark:border-border px-3 py-1.5"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    <Heart className="h-3 w-3 text-endurix-black/50 dark:text-muted-foreground" />
                                    <span className="text-[9px] font-medium text-endurix-black dark:text-foreground tracking-wider uppercase">
                                        {activity.average_heartrate.toFixed(0)} {t('metrics.bpm')} {t('metrics.avgHr')}
                                    </span>
                                </span>
                            )}
                            {!isWeightTraining(activity.sport_type) && activity.suffer_score && (
                                <span
                                    className="inline-block bg-endurix-orange text-white text-[10px] font-bold tracking-widest px-3 py-1.5"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    {activity.suffer_score.toFixed(0)}/100 {t('metrics.sufferScore')}
                                </span>
                            )}
                            {isWeightTraining(activity.sport_type) && !activity.average_heartrate && (
                                <span
                                    className="inline-block bg-endurix-black dark:bg-white text-white dark:text-endurix-black text-[10px] font-bold tracking-widest px-3 py-1.5"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    {t('metrics.generalWorkout')}
                                </span>
                            )}
                        </div>
                    </div>

                    {isAthlete && (
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="inline-flex items-center gap-2 border border-endurix-orange text-endurix-orange text-xs font-bold tracking-widest px-4 py-2 transition-all hover:bg-endurix-orange hover:text-white shrink-0"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            <LinkIcon className="h-3 w-3" />
                            {workoutAssignment ? t('actions.editLink') : t('actions.linkWorkout')}
                        </button>
                    )}
                </div>

                {/* Metrics + Compliance */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-stretch">
                    <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                        <div className="grid w-full grid-cols-2 lg:grid-cols-4 gap-6">
                            {!isWeightTraining(activity.sport_type) && (
                                <div className="text-left">
                                    <span
                                        className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('metrics.distance')}
                                    </span>
                                    <div className="flex items-baseline gap-1.5 mt-2">
                                        <span
                                            className="text-4xl font-bold text-endurix-black dark:text-foreground leading-none"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {distanceKm}
                                        </span>
                                        <span
                                            className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-wider"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {t('metrics.units.km')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!isWeightTraining(activity.sport_type) && (
                                <div className="text-left">
                                    <span
                                        className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('metrics.avgPace')}
                                    </span>
                                    <div className="flex items-baseline gap-1.5 mt-2">
                                        <span
                                            className="text-4xl font-bold text-endurix-black dark:text-foreground leading-none"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {isRunning(activity.sport_type) ? avgPace : formatSpeed(activity.average_speed)}
                                        </span>
                                        <span
                                            className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-wider"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {isRunning(activity.sport_type) ? t('metrics.units.perKm') : t('metrics.units.kmh')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="text-left">
                                <span
                                    className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    {t('metrics.duration')}
                                </span>
                                <div className="mt-2">
                                    <span
                                        className="text-4xl font-bold text-endurix-black dark:text-foreground leading-none"
                                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                    >
                                        {formatTime(activity.moving_time)}
                                    </span>
                                </div>
                            </div>

                            {!isWeightTraining(activity.sport_type) && activity.total_elevation_gain > 0 && (
                                <div className="text-left">
                                    <span
                                        className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('metrics.elevationGain')}
                                    </span>
                                    <div className="flex items-baseline gap-1.5 mt-2">
                                        <span
                                            className="text-4xl font-bold text-endurix-black dark:text-foreground leading-none"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            +{activity.total_elevation_gain.toFixed(0)}
                                        </span>
                                        <span
                                            className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-wider"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {t('metrics.units.m')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {isWeightTraining(activity.sport_type) && activity.average_heartrate && (
                                <div className="text-left">
                                    <span
                                        className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('metrics.avgHr')}
                                    </span>
                                    <div className="flex items-baseline gap-1.5 mt-2">
                                        <span
                                            className="text-4xl font-bold text-endurix-black dark:text-foreground leading-none"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {activity.average_heartrate.toFixed(0)}
                                        </span>
                                        <span
                                            className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-wider"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {t('metrics.bpm')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </article>

                    {compliance && (
                        <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-5 flex items-center justify-center">
                            <ZoneComplianceCard compliance={compliance} />
                        </article>
                    )}
                </div>

                {/* Feedback */}
                <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                    <div className="px-4 py-2.5 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                        <span
                            className="text-[9px] text-endurix-black/60 dark:text-muted-foreground tracking-widest"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {t('feedback.title')}
                        </span>
                    </div>
                    <div className="p-6">
                        {isAthlete ? (
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex-1">
                                    <Label
                                        htmlFor="rpe"
                                        className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('feedback.rpeLabel')}
                                    </Label>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground uppercase"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {t('rpe.veryEasy')}
                                        </span>
                                        <Slider id="rpe" min={1} max={10} step={1} value={[feedback.rpe || 5]} onValueChange={(value) => setFeedback({ ...feedback, rpe: value[0] })} className="flex-1" />
                                        <span
                                            className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground uppercase"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {t('rpe.maximumEffort')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span
                                            className="text-2xl font-bold text-endurix-black dark:text-foreground"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {feedback.rpe || 5}
                                        </span>
                                        <span
                                            className="text-[10px] text-endurix-black/50 dark:text-muted-foreground"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            /10
                                        </span>
                                        <span
                                            className="text-[10px] font-medium text-endurix-black/50 dark:text-muted-foreground ml-2"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >
                                            {getRPELabel(feedback.rpe || 5)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <Label
                                        htmlFor="comments"
                                        className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('feedback.notesLabel')}
                                    </Label>
                                    <Textarea id="comments" placeholder={t('feedback.placeholder')} value={feedback.comments} onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })} rows={3} className="bg-transparent border-0 border-b border-endurix-black/15 dark:border-border px-0 py-3 text-sm text-endurix-black dark:text-foreground placeholder:text-endurix-black/30 dark:placeholder:text-muted-foreground focus:border-endurix-orange focus:outline-none focus:shadow-[0_4px_12px_rgba(255,104,0,0.08)] resize-none" />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSaveFeedback}
                                        disabled={feedbackSaving}
                                        className="bg-endurix-orange text-white text-xs font-bold tracking-widest px-8 py-4 transition-all hover:bg-endurix-orange/90 disabled:opacity-50"
                                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                    >
                                        {feedbackSaving ? t('feedback.saving') : feedback.id ? t('feedback.update') : t('feedback.save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex-1">
                                    <span
                                        className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('feedback.coachViewRpe')}
                                    </span>
                                    {feedback.rpe ? (
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="text-2xl font-bold text-endurix-black dark:text-foreground"
                                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                            >
                                                {feedback.rpe}
                                            </span>
                                            <span
                                                className="text-[10px] text-endurix-black/50 dark:text-muted-foreground"
                                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                            >
                                                /10
                                            </span>
                                            <span
                                                className="text-[10px] font-medium text-endurix-black/50 dark:text-muted-foreground ml-2"
                                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                            >
                                                {getRPELabel(feedback.rpe)}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-endurix-black/50 dark:text-muted-foreground italic">{t('feedback.noExertion')}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <span
                                        className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('feedback.notesLabel')}
                                    </span>
                                    {feedback.comments ? (
                                        <p className="text-sm text-endurix-black dark:text-foreground leading-relaxed whitespace-pre-wrap">{feedback.comments}</p>
                                    ) : (
                                        <p className="text-sm text-endurix-black/50 dark:text-muted-foreground italic">{t('feedback.noNotes')}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </article>

                {/* Charts with Tabs */}
                <ActivityChartsTabs
                    activity={activity}
                    internalId={internalId}
                    heartrateZones={heartrateZones}
                    matchedLaps={matchedLaps}
                    isRunning={isRunning}
                    isWeightTraining={isWeightTraining}
                    isAthlete={isAthlete}
                    lapOverrides={activity.lap_overrides || {}}
                    onOverrideStepType={handleOverrideStepType}
                    onBulkOverrideStepType={handleBulkOverrideStepType}
                    formatTime={formatTime}
                    formatPace={formatPace}
                    getHRZoneColor={getHRZoneColor}
                    t={t}
                />

                {/* Heart Rate Zones - Always visible */}
                {!isWeightTraining(activity.sport_type) && activity.average_heartrate && heartrateZones?.zones && (
                    <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                        <div className="px-4 py-2.5 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border flex items-center justify-between">
                            <span
                                className="text-[9px] text-endurix-black/60 dark:text-muted-foreground tracking-widest"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {t('charts.hrPerformance')}
                            </span>
                            <div className="flex items-center gap-4">
                                <span
                                    className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-wider"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    {t('metrics.avgHrLabel')}: <strong className="text-endurix-black dark:text-foreground">{activity.average_heartrate?.toFixed(0) || '--'} {t('metrics.bpm')}</strong>
                                </span>
                                {activity.max_heartrate && (
                                    <span
                                        className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-wider"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {t('metrics.maxHrLabel')}: <strong className="text-endurix-black dark:text-foreground">{activity.max_heartrate.toFixed(0)} {t('metrics.bpm')}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="p-6">
                            <HrZonesPieChart
                                laps={activity.laps}
                                splits={activity.splits_metric}
                                zones={heartrateZones.zones}
                            />
                        </div>
                    </article>
                )}

                <LinkWorkoutModal
                    isOpen={isLinkModalOpen}
                    onClose={() => setIsLinkModalOpen(false)}
                    activityId={internalId}
                    activityTitle={activity.name}
                    onLinkSuccess={() => window.location.reload()}
                />

                <AlertDialog open={alertState.open} onClose={closeAlert} type={alertState.type} title={alertState.title} message={alertState.message} confirmText={alertState.confirmText} />
            </div>
        </div>
    );
}
