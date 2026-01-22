'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { MatchQualityBadge } from './MatchQualityBadge';
import { Card } from '@/components/ui/card';
import { Target, Clock, MapPin, TrendingUp, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface WorkoutMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignmentId: string;
    workoutTitle: string;
}

export function WorkoutMatchModal({ isOpen, onClose, assignmentId, workoutTitle }: WorkoutMatchModalProps) {
    const [match, setMatch] = useState<WorkoutMatch | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && assignmentId) {
            fetchMatch();
        }
    }, [isOpen, assignmentId]);

    const fetchMatch = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await matchingService.getMatch(assignmentId);
            setMatch(data);
        } catch (err: any) {
            console.error('Failed to fetch match:', err);
            setError('No se pudo cargar la comparación');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Comparación de Entrenamiento
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">{workoutTitle}</p>
                </DialogHeader>

                {loading && (
                    <div className="py-12 text-center text-muted-foreground">
                        Cargando comparación...
                    </div>
                )}

                {error && (
                    <div className="py-12 text-center text-red-500">
                        {error}
                    </div>
                )}

                {!loading && !error && match && !match.matched && (
                    <div className="py-12 text-center text-muted-foreground">
                        <p>No se encontró una actividad completada para este entrenamiento.</p>
                        <p className="text-sm mt-2">
                            Completa el entrenamiento y sincroniza con Strava para ver la comparación.
                        </p>
                    </div>
                )}

                {!loading && !error && match && match.matched && match.matchQuality && (
                    <div className="space-y-6">
                        {/* Overall Score Card */}
                        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                                        Calificación General
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
                                        Objetivo: <span className="font-semibold capitalize">{match.matchQuality.objectiveType === 'distance' ? 'Distancia' : 'Tiempo'}</span>
                                    </p>
                                </div>
                                <div className={`p-4 rounded-full ${getMatchScoreBgColor(match.matchQuality.overallScore)}`}>
                                    <CheckCircle2 className={`w-12 h-12 ${getMatchScoreColor(match.matchQuality.overallScore)}`} />
                                </div>
                            </div>
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
                                            Distancia
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Planificado:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDistance(match.matchQuality.plannedDistance || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Realizado:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDistance(match.matchQuality.actualDistance || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Diferencia:</span>
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
                                            Duración
                                        </h4>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Planificado:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDuration(match.matchQuality.plannedDuration || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Realizado:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatDuration(match.matchQuality.actualDuration || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Diferencia:</span>
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
                        {match.activityExternalId && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link
                                    href={`/activities/${match.activityExternalId}`}
                                    className="text-orange-600 dark:text-orange-400 hover:underline font-medium flex items-center gap-2"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Ver detalles completos de la actividad
                                </Link>
                            </div>
                        )}

                        {/* Block Comparison (if available) */}
                        {match.blockComparison && match.blockComparison.length > 0 && (
                            <Card className="p-5">
                                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4">
                                    Bloques del Entrenamiento
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
                                                        🎯 Ritmo: {block.planned.targetPace.min} - {block.planned.targetPace.max} min/km
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
