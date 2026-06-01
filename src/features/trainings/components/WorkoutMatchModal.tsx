'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutMatch } from '../types';
import { matchingService } from '../services/matching.service';
import {
    formatDistance,
    formatDuration,
    formatDifference,
    getDifferenceColor,
    getMatchScoreColor,
    getMatchScoreBgColor,
    getMatchCategory,
} from '../utils/matchingUtils';
import { Card } from '@/components/ui/card';
import { Clock, MapPin, TrendingUp, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { MatchCandidateActivity } from '../types';

interface WorkoutMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignmentId: string;
    workoutTitle: string;
}

export function WorkoutMatchModal({ isOpen, onClose, assignmentId, workoutTitle }: WorkoutMatchModalProps) {
    const t = useTranslations('workouts.matchModal');
    const locale = useLocale();
    const [match, setMatch] = useState<WorkoutMatch | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Manual match state
    const [showCandidates, setShowCandidates] = useState(false);
    const [candidates, setCandidates] = useState<MatchCandidateActivity[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    const fetchMatch = useCallback(async (activityId?: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await matchingService.getMatch(assignmentId, activityId);
            setMatch(data);
        } catch (err: unknown) {
            appLogger.error('Failed to fetch match:', err);
            setError(t('errorLoad'));
        } finally {
            setLoading(false);
        }
    }, [assignmentId, t]);

    useEffect(() => {
        if (isOpen && assignmentId) {
            fetchMatch();
        }
    }, [isOpen, assignmentId, fetchMatch]);

    const handleFetchCandidates = async () => {
        try {
            setLoadingCandidates(true);
            const data = await matchingService.getCandidateActivities(assignmentId);
            setCandidates(data);
            setShowCandidates(true);
        } catch (err) {
            appLogger.error('Failed to load candidates', err);
        } finally {
            setLoadingCandidates(false);
        }
    };

    const handleSelectCandidate = async (activityId: string) => {
        try {
            setLoading(true); // Show loading state on main modal
            await matchingService.linkActivity(assignmentId, activityId);
            await fetchMatch(); // Allow backend to pick up the new link
            setShowCandidates(false);
        } catch (err) {
            appLogger.error('Failed to link activity:', err);
            setError(t('errorLink'));
            setLoading(false);
        }
    };

    const handleUnlink = async () => {
        if (!confirm(t('confirmUnlink'))) return;
        try {
            setLoading(true);
            await matchingService.unlinkActivity(assignmentId);
            await fetchMatch(); // Revert to auto-match
        } catch (err) {
            appLogger.error('Failed to unlink activity:', err);
            setError(t('errorUnlink'));
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-white/15">
                <DialogHeader className="border-b border-endurix-black/10 dark:border-border">
                    <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                        {t('title')}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{workoutTitle}</p>
                </DialogHeader>

                {loading && (
                    <div className="py-12 text-center text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        {t('loading')}
                    </div>
                )}

                {error && (
                    <div className="py-12 text-center text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {!loading && !error && match && !match.matched && !showCandidates && (
                    <div className="py-12 text-center text-muted-foreground space-y-4">
                        <div>
                            <p>{t('notFound')}</p>
                            <p className="text-sm mt-2">
                                {t('notFoundDesc')}
                            </p>
                        </div>
                        <div className="pt-4">
                            <Button
                                variant="outline-brand"
                                onClick={handleFetchCandidates}
                                disabled={loadingCandidates}
                                className="uppercase tracking-widest text-[10px]"
                            >
                                {loadingCandidates ? t('searching') : t('linkManual')}
                            </Button>
                        </div>
                    </div>
                )}

                {!loading && !error && showCandidates && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('selectActivity')}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowCandidates(false)} className="uppercase tracking-widest text-[10px]">{t('cancel')}</Button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {candidates.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {t('noRecentActivities')}
                                </p>
                            ) : (
                                candidates.map(activity => (
                                    <div
                                        key={activity.id}
                                        onClick={() => handleSelectCandidate(activity.id)}
                                        className="p-3 border border-endurix-black/15 dark:border-white/15 hover:bg-endurix-orange/5 hover:border-endurix-orange cursor-pointer flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-endurix-black dark:text-foreground uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{activity.title}</div>
                                            <div className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                {new Date(activity.start_date).toLocaleDateString(locale)} • {(activity.distance / 1000).toFixed(2)} km
                                            </div>
                                        </div>
                                        <Button size="sm" variant="orange" className="uppercase tracking-widest text-[10px]">{t('link')}</Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {!loading && !error && match && match.matched && match.matchQuality && (
                    <div className="space-y-6">
                        {/* Overall Score Card */}
                        <Card className="p-6 bg-endurix-orange/10 border border-endurix-orange/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                        {t('overallScore')}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-4xl font-bold ${getMatchScoreColor(match.matchQuality.overallScore)}`} style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                            {match.matchQuality.overallScore}%
                                        </span>
                                        <span className="text-xl text-endurix-black/60 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                            {getMatchCategory(match.matchQuality.overallScore)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-endurix-black/60 dark:text-muted-foreground mt-2" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                        {t('objective')} <span className="font-bold uppercase tracking-widest text-endurix-black dark:text-foreground">{match.matchQuality.objectiveType === 'distance' ? t('objectiveDistance') : t('objectiveTime')}</span>
                                    </p>
                                </div>
                                <div className={`p-4 ${getMatchScoreBgColor(match.matchQuality.overallScore)}`}>
                                    <CheckCircle2 className={`w-12 h-12 ${getMatchScoreColor(match.matchQuality.overallScore)}`} />
                                </div>
                            </div>
                            {match.isManualMatch && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        variant="outline-brand"
                                        size="sm"
                                        onClick={handleUnlink}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/30 uppercase tracking-widest text-[10px]"
                                    >
                                        {t('unlinkActivity')}
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* Stats Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Distance */}
                            <Card className="p-5 bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-endurix-orange/10">
                                        <MapPin className="w-5 h-5 text-endurix-orange" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                            {t('distance')}
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('planned')}</span>
                                                <span className="font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {formatDistance(match.matchQuality.plannedDistance || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('actual')}</span>
                                                <span className="font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {formatDistance(match.matchQuality.actualDistance || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-endurix-black/10 dark:border-border">
                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('difference')}</span>
                                                <span className={`font-bold ${getDifferenceColor(match.matchQuality.distanceMatch || 0)}`} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {formatDifference(match.matchQuality.distanceMatch || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Duration */}
                            <Card className="p-5 bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                        <Clock className="w-5 h-5 text-endurix-orange" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                            {t('duration')}
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('planned')}</span>
                                                <span className="font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {formatDuration(match.matchQuality.plannedDuration || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('actual')}</span>
                                                <span className="font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {formatDuration(match.matchQuality.actualDuration || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-endurix-black/10 dark:border-border">
                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('difference')}</span>
                                                <span className={`font-bold ${getDifferenceColor(match.matchQuality.durationMatch || 0)}`} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {formatDifference(match.matchQuality.durationMatch || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Activity Link */}
                        {match.activityId && (
                            <div className="pt-4 border-t border-endurix-black/10 dark:border-border">
                                <Link
                                    href={`/activities/${match.activityId}`}
                                    className="text-endurix-orange hover:underline font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]"
                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    {t('viewDetails')}
                                </Link>
                            </div>
                        )}

                        {/* Block Comparison (if available) */}
                        {match.blockComparison && match.blockComparison.length > 0 && (
                            <Card className="p-5 bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15">
                                <h4 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('workoutBlocks')}
                                </h4>
                                <div className="space-y-2">
                                    {match.blockComparison.map((block, index) => (
                                        <div
                                            key={block.blockId}
                                            className="p-3 bg-endurix-black/5 dark:bg-white/5 border border-endurix-black/10 dark:border-white/10"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    {index + 1}.
                                                </span>
                                                <span className="text-sm font-bold text-endurix-black dark:text-foreground uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                                    {block.blockName || block.blockType}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-endurix-black/60 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                {block.planned.distance && block.planned.distance > 0 && (
                                                    <span>📏 {formatDistance(block.planned.distance)}</span>
                                                )}
                                                {block.planned.duration && block.planned.duration > 0 && (
                                                    <span>⏱️ {formatDuration(block.planned.duration)}</span>
                                                )}
                                                {block.planned.targetPace && (
                                                    <span className="col-span-2">
                                                        🎯 {t('pace', { min: block.planned.targetPace.min, max: block.planned.targetPace.max })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
