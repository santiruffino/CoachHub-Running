'use client';

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
            console.error('Failed to fetch match:', err);
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
            console.error('Failed to load candidates', err);
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
            console.error('Failed to link activity:', err);
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
            console.error('Failed to unlink activity:', err);
            setError(t('errorUnlink'));
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {t('title')}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">{workoutTitle}</p>
                </DialogHeader>

                {loading && (
                    <div className="py-12 text-center text-muted-foreground">
                        {t('loading')}
                    </div>
                )}

                {error && (
                    <div className="py-12 text-center text-red-500">
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
                                variant="outline"
                                onClick={handleFetchCandidates}
                                disabled={loadingCandidates}
                            >
                                {loadingCandidates ? t('searching') : t('linkManual')}
                            </Button>
                        </div>
                    </div>
                )}

                {!loading && !error && showCandidates && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">{t('selectActivity')}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowCandidates(false)}>{t('cancel')}</Button>
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
                                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">{activity.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(activity.start_date).toLocaleDateString(locale)} • {(activity.distance / 1000).toFixed(2)} km
                                            </div>
                                        </div>
                                        <Button size="sm" variant="ghost">{t('link')}</Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {!loading && !error && match && match.matched && match.matchQuality && (
                    <div className="space-y-6">
                        {/* Overall Score Card */}
                        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                                        {t('overallScore')}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-4xl font-bold ${getMatchScoreColor(match.matchQuality.overallScore)}`}>
                                            {match.matchQuality.overallScore}%
                                        </span>
                                        <span className="text-xl text-gray-600 dark:text-gray-400">
                                            {getMatchCategory(match.matchQuality.overallScore)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                        {t('objective')} <span className="font-semibold capitalize">{match.matchQuality.objectiveType === 'distance' ? t('objectiveDistance') : t('objectiveTime')}</span>
                                    </p>
                                </div>
                                <div className={`p-4 rounded-full ${getMatchScoreBgColor(match.matchQuality.overallScore)}`}>
                                    <CheckCircle2 className={`w-12 h-12 ${getMatchScoreColor(match.matchQuality.overallScore)}`} />
                                </div>
                            </div>
                            {match.isManualMatch && (
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleUnlink}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    >
                                        {t('unlinkActivity')}
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* Stats Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Distance */}
                            <Card className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                                            {t('distance')}
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('planned')}</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDistance(match.matchQuality.plannedDistance || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('actual')}</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDistance(match.matchQuality.actualDistance || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('difference')}</span>
                                                <span className={`font-bold ${getDifferenceColor(match.matchQuality.distanceMatch || 0)}`}>
                                                    {formatDifference(match.matchQuality.distanceMatch || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Duration */}
                            <Card className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                                            {t('duration')}
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('planned')}</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDuration(match.matchQuality.plannedDuration || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('actual')}</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDuration(match.matchQuality.actualDuration || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('difference')}</span>
                                                <span className={`font-bold ${getDifferenceColor(match.matchQuality.durationMatch || 0)}`}>
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
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link
                                    href={`/activities/${match.activityId}`}
                                    className="text-orange-600 dark:text-orange-400 hover:underline font-medium flex items-center gap-2"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    {t('viewDetails')}
                                </Link>
                            </div>
                        )}

                        {/* Block Comparison (if available) */}
                        {match.blockComparison && match.blockComparison.length > 0 && (
                            <Card className="p-5">
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4">
                                    {t('workoutBlocks')}
                                </h4>
                                <div className="space-y-2">
                                    {match.blockComparison.map((block, index) => (
                                        <div
                                            key={block.blockId}
                                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                    {index + 1}.
                                                </span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                                                    {block.blockName || block.blockType}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
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
