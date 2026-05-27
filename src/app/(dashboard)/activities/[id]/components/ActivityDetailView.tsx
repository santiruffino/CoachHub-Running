'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTranslations, useFormatter } from 'next-intl';
import api from '@/lib/axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import {
    Activity as ActivityIcon,
    ArrowLeft,
    Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartRateZonesChart } from '@/app/(dashboard)/activities/components/HeartRateZonesChart';
import { PaceZonesChart } from '@/app/(dashboard)/activities/components/PaceZonesChart';
import { IntervalsAnalysisChart } from '@/app/(dashboard)/activities/components/IntervalsAnalysisChart';
import { ZoneComplianceCard } from '@/app/(dashboard)/activities/components/ZoneComplianceCard';
import { LapFilterBadges } from '@/app/(dashboard)/activities/components/LapFilterBadges';
import { LapsTable } from '@/app/(dashboard)/activities/components/LapsTable';
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

function ActivityChartLoading() {
    return (
        <div className="h-full w-full p-6 lg:p-8">
            <div className="h-full w-full rounded-2xl border border-border/50 bg-muted/30 p-5 lg:p-6">
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <div className="grid grid-cols-12 gap-2 h-[360px] lg:h-[440px] items-end">
                    {Array.from({ length: 12 }).map((_, idx) => (
                        <Skeleton
                            key={idx}
                            className="w-full rounded-lg"
                            style={{ height: `${40 + ((idx * 29) % 55)}%` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

const ActivityChart = dynamic(
    () => import('@/app/(dashboard)/activities/components/ActivityChart').then(mod => ({ default: mod.ActivityChart })),
    {
        ssr: false,
        loading: () => <ActivityChartLoading />,
    }
);

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
    const router = useRouter();
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
    const [lapFilter, setLapFilter] = useState<'all' | 'warmup' | 'active' | 'recovery' | 'cooldown'>('all');
    
    const internalId = activity._internalId || id;
    const isAthlete = activity._viewerIsOwner || false;

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

    const getPaceZoneColor = (zone?: number): string => {
        if (!zone) return 'bg-gray-500';
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
        return colors[zone - 1] || 'bg-gray-500';
    };

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

    return (
        <div className="space-y-12 p-4 md:p-8 max-w-[1400px] mx-auto pb-20 bg-background min-h-screen">
            <div className="flex items-center gap-4 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {getSportTranslation(activity.sport_type)}
                </p>
            </div>

            <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-medium text-foreground leading-tight max-w-5xl tracking-tight">
                    {activity.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-muted text-muted-foreground border border-muted-foreground/10">
                        {(() => { const d = new Date(activity.start_date_local ?? activity.start_date); return isNaN(d.getTime()) ? '' : intlFormat.dateTime(d, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(); })()}
                    </span>
                    {!isWeightTraining(activity.sport_type) && activity.average_heartrate && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/50 text-accent-foreground">
                            {`${t('metrics.avgHr')}: ${activity.average_heartrate.toFixed(0)} ${t('metrics.bpm')}`}
                        </span>
                    )}
                    {!isWeightTraining(activity.sport_type) && activity.suffer_score && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/50 text-accent-foreground">
                            {t('metrics.sufferScore')}: {activity.suffer_score.toFixed(0)}
                        </span>
                    )}
                    {isWeightTraining(activity.sport_type) && !activity.average_heartrate && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/50 text-accent-foreground">
                            {t('metrics.generalWorkout')}
                        </span>
                    )}
                    {isAthlete && (
                        <Button variant="ghost" size="sm" onClick={() => setIsLinkModalOpen(true)} className="text-xs text-muted-foreground hover:text-foreground ml-2">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            {workoutAssignment ? t('actions.editLink') : t('actions.linkWorkout')}
                        </Button>
                    )}
                </div>
            </div>

            {compliance && (
                <div className="max-w-4xl">
                    <ZoneComplianceCard compliance={compliance} />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-6 items-stretch">
                <div className="bg-muted rounded-3xl p-5 lg:p-6 min-h-[320px] h-full flex items-center shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted/50">
                    <div className="grid w-full h-full grid-cols-2 gap-y-8 content-center">
                        {!isWeightTraining(activity.sport_type) && (
                            <div className="min-w-0 pr-4 lg:pr-6 text-center flex flex-col items-center justify-center h-full">
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('metrics.distance')}</p>
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-4xl font-display font-medium text-foreground leading-none tracking-tighter">{distanceKm}</span>
                                    <span className="text-lg font-medium text-muted-foreground mb-1">{t('metrics.units.km')}</span>
                                </div>
                            </div>
                        )}

                        {!isWeightTraining(activity.sport_type) && (
                            <div className="min-w-0 pl-4 lg:pl-6 border-l border-border/60 text-center flex flex-col items-center justify-center h-full">
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('metrics.avgPace')}</p>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-display font-medium text-foreground leading-none tracking-tighter">
                                        {isRunning(activity.sport_type) ? avgPace : formatSpeed(activity.average_speed)}
                                    </span>
                                    <span className="text-lg font-medium text-muted-foreground mb-1">
                                        {isRunning(activity.sport_type) ? t('metrics.units.perKm') : t('metrics.units.kmh')}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="min-w-0 pr-4 lg:pr-6 text-center flex flex-col items-center justify-center h-full">
                            <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('metrics.duration')}</p>
                            <span className="text-4xl font-display font-medium text-foreground leading-none tracking-tighter inline-block">{formatTime(activity.moving_time)}</span>
                        </div>

                        {!isWeightTraining(activity.sport_type) && activity.total_elevation_gain > 0 && (
                            <div className="min-w-0 pl-4 lg:pl-6 border-l border-border/60 text-center flex flex-col items-center justify-center h-full">
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('metrics.elevationGain')}</p>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-display font-medium text-foreground leading-none tracking-tighter">+{activity.total_elevation_gain.toFixed(0)}</span>
                                    <span className="text-lg font-medium text-muted-foreground mb-1">{t('metrics.units.m')}</span>
                                </div>
                            </div>
                        )}

                        {isWeightTraining(activity.sport_type) && activity.average_heartrate && (
                            <div className="min-w-0 pl-4 lg:pl-6 border-l border-border/60 text-center flex flex-col items-center justify-center h-full">
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('metrics.avgHr')}</p>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-display font-medium text-foreground leading-none tracking-tighter">{activity.average_heartrate.toFixed(0)}</span>
                                    <span className="text-lg font-medium text-muted-foreground mb-1">{t('metrics.bpm')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-card rounded-3xl p-5 lg:p-6 min-h-[320px] h-full shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <h2 className="text-xl font-display font-medium text-foreground mb-6">{t('feedback.title')}</h2>
                    <div className="flex flex-col space-y-6">
                        {isAthlete ? (
                            <>
                                <div>
                                    <Label htmlFor="rpe" className="text-xs tracking-widest uppercase font-semibold text-muted-foreground mb-3 block">{t('feedback.rpeLabel')}</Label>
                                    <div className="flex items-center gap-4">
                                        <Slider id="rpe" min={1} max={10} step={1} value={[feedback.rpe || 5]} onValueChange={(value) => setFeedback({ ...feedback, rpe: value[0] })} className="flex-1" />
                                        <div className="bg-muted w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-muted">
                                            <p className="text-2xl font-display font-medium text-foreground">{feedback.rpe || 5}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className={`h-2 flex-1 rounded-full ${getRPEColor(feedback.rpe || 5)} opacity-80`} />
                                        <p className="text-sm font-medium text-primary min-w-[80px] text-right">{getRPELabel(feedback.rpe || 5)}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="comments" className="text-xs tracking-widest uppercase font-semibold text-muted-foreground mb-3 block">{t('feedback.notesLabel')}</Label>
                                    <Textarea id="comments" placeholder={t('feedback.placeholder')} value={feedback.comments} onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })} rows={3} className="bg-muted border-muted rounded-xl focus-visible:ring-1 focus-visible:ring-primary resize-none text-foreground" />
                                </div>
                                <div>
                                    <Button onClick={handleSaveFeedback} disabled={feedbackSaving} className="bg-foreground hover:bg-foreground/90 text-background px-6 py-5 rounded-xl font-medium shadow-md transition-all">
                                        {feedbackSaving ? t('feedback.saving') : feedback.id ? t('feedback.update') : t('feedback.save')}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <Label className="text-[10px] tracking-widest uppercase font-semibold text-muted-foreground pb-3 block">{t('feedback.coachViewRpe')}</Label>
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
                                        <p className="text-sm text-muted-foreground italic px-2">{t('feedback.noExertion')}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-[10px] tracking-widest uppercase font-semibold text-muted-foreground pb-3 block">{t('feedback.notesLabel')}</Label>
                                    {feedback.comments ? (
                                        <div className="bg-background border border-muted rounded-2xl p-4 h-full min-h-[100px]">
                                            <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{feedback.comments}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">{t('feedback.noNotes')}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!isWeightTraining(activity.sport_type) && (
                <div className="bg-card rounded-3xl p-2 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <div className="h-[460px] lg:h-[560px] w-full bg-muted rounded-2xl overflow-hidden relative">
                        <ActivityChart activityId={internalId} laps={activity.laps} hrZones={heartrateZones?.zones} isRunning={isRunning(activity.sport_type)} />
                    </div>
                </div>
            )}

            {!isWeightTraining(activity.sport_type) && activity.laps && activity.laps.length > 0 && (
                <div className="bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <IntervalsAnalysisChart
                        laps={activity.laps}
                        isRunning={isRunning(activity.sport_type)}
                        lapOverrides={activity.lap_overrides || {}}
                        matchedLaps={matchedLaps}
                    />
                </div>
            )}

            {!isWeightTraining(activity.sport_type) && (activity.laps?.length || activity.splits_metric) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold font-display tracking-tight text-foreground">{t('charts.hrPerformance')}</h3>
                            {activity.average_heartrate && (
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{t('charts.liveTracking')}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-baseline mb-8">
                            <div>
                                <span className="text-5xl font-display font-medium text-foreground">{activity.average_heartrate?.toFixed(0) || '--'}</span>
                                <span className="text-sm font-medium text-muted-foreground ml-2 tracking-wide">{t('metrics.avgHrLabel')}</span>
                            </div>
                            {activity.max_heartrate && (
                                <span className="text-lg font-bold text-red-500 tracking-wide">{activity.max_heartrate.toFixed(0)} <span className="text-xs">{t('metrics.maxHrLabel')}</span></span>
                            )}
                        </div>
                        <div className="flex-1 -mx-4 -mb-4">
                            {activity.average_heartrate && heartrateZones?.zones && (
                                <HeartRateZonesChart laps={activity.laps} splits={activity.splits_metric} zones={heartrateZones.zones} />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col h-full pl-0 lg:pl-10 lg:border-l border-border/20 pt-8 lg:pt-0">
                        <h3 className="text-lg font-semibold font-display tracking-tight text-foreground mb-8">{t('charts.intensityDistribution')}</h3>
                        <div className="flex-1 -mx-4 -mb-4">
                            {isRunning(activity.sport_type) && (
                                <PaceZonesChart laps={activity.laps} splits={activity.splits_metric} isRunning={isRunning(activity.sport_type)} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!isWeightTraining(activity.sport_type) && (activity.laps?.length || activity.splits_metric || activity.splits_standard) && (
                <div className="bg-card rounded-3xl p-8 shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                    <Tabs defaultValue={activity.laps?.length ? "laps" : "metric"} className="w-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-display font-medium text-foreground">{t('tabs.analysis')}</h2>
                            <TabsList className="bg-muted p-1 rounded-xl">
                                {activity.laps && activity.laps.length > 0 && (
                                    <TabsTrigger value="laps" className="rounded-lg text-xs tracking-widest uppercase font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">{t('tabs.autoLaps')}</TabsTrigger>
                                )}
                                {activity.splits_metric && (
                                    <TabsTrigger value="metric" className="rounded-lg text-xs tracking-widest uppercase font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">{t('tabs.kmSplits')}</TabsTrigger>
                                )}
                            </TabsList>
                        </div>

                        {activity.laps && activity.laps.length > 0 && (
                            <TabsContent value="laps" className="mt-0 outline-none">
                                <LapFilterBadges value={lapFilter} onChange={setLapFilter} t={t} />
                                <LapsTable laps={activity.laps} matchedLaps={matchedLaps} lapFilter={lapFilter} isAthlete={isAthlete} lapOverrides={activity.lap_overrides || {}} onOverrideStepType={handleOverrideStepType} onBulkOverrideStepType={handleBulkOverrideStepType} formatTime={formatTime} formatPace={formatPace} getHRZoneColor={getHRZoneColor} t={t} />
                            </TabsContent>
                        )}

                        {activity.splits_metric && (
                            <TabsContent value="metric" className="mt-0 outline-none">
                                <div className="overflow-x-auto">
                                    <Table className="w-full">
                                        <TableHeader>
                                            <TableRow className="border-b border-muted hover:bg-transparent">
                                                <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 pl-0">{t('table.split')}</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.time')}</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.distance')}</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.avgPace')}</TableHead>
                                                {!!activity.splits_metric[0]?.average_heartrate && (
                                                    <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.avgHr')}</TableHead>
                                                )}
                                                <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.elevGain')}</TableHead>
                                                <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 text-right pr-0"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activity.splits_metric.map((split) => (
                                                <TableRow key={split.split}>
                                                    <TableCell className="font-medium">{split.split}</TableCell>
                                                    <TableCell>{formatTime(split.moving_time)}</TableCell>
                                                    <TableCell>{(split.distance / 1000).toFixed(2)} {t('metrics.units.km')}</TableCell>
                                                    <TableCell>{formatPace(split.average_speed)}</TableCell>
                                                    {!!activity.splits_metric![0]?.average_heartrate && (
                                                        <TableCell>
                                                            {split.average_heartrate ? (
                                                                <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(split.average_heartrate)}`}>
                                                                    {split.average_heartrate.toFixed(0)} {t('metrics.units.bpm')}
                                                                </span>
                                                            ) : (<span className="text-muted-foreground">-</span>)}
                                                        </TableCell>
                                                    )}
                                                    <TableCell>{split.elevation_difference > 0 ? '+' : ''}{split.elevation_difference.toFixed(1)} {t('metrics.units.m')}</TableCell>
                                                    <TableCell className="text-right pr-0">
                                                        <div className="inline-block h-2 w-12 rounded overflow-hidden bg-muted">
                                                            <div className={`h-full ${getPaceZoneColor(split.pace_zone)}`} />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        )}
                        
                        {/* Legend */}
                        {heartrateZones?.zones && activity.average_heartrate && (
                            <div className="mt-8 pt-6 border-t border-muted">
                                <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase mb-4">{t('legend.hrZones')}</p>
                                <div className="flex flex-wrap gap-4">
                                    {heartrateZones.zones.map((z, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${['bg-muted-foreground/40', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'][i]}`}></span>
                                            <span className="text-xs font-medium text-foreground">{t(`zones.short.z${i + 1}`)} <span className="text-muted-foreground ml-1">({z.min}-{z.max})</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Tabs>
                </div>
            )}

            {activity && (
                <LinkWorkoutModal
                    isOpen={isLinkModalOpen}
                    onClose={() => setIsLinkModalOpen(false)}
                    activityId={internalId}
                    activityTitle={activity.name}
                    onLinkSuccess={() => window.location.reload()}
                />
            )}

            <AlertDialog open={alertState.open} onClose={closeAlert} type={alertState.type} title={alertState.title} message={alertState.message} confirmText={alertState.confirmText} />
        </div>
    );
}
