'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Clock, MapPin, TrendingUp, Target, Heart, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MatchQualityBadge } from '@/features/trainings/components/MatchQualityBadge';
import { WorkoutMatchModal } from '@/features/trainings/components/WorkoutMatchModal';
import { WorkoutMatch } from '@/features/trainings/types';

export interface SessionData {
    id: string;
    type: 'PLANNED' | 'COMPLETED';
    title: string;
    subtitle?: string;
    description?: string;
    date?: Date | string;
    stats?: {
        distance?: number;
        duration?: number;
        pace?: string;
        calories?: number;
        elevation?: number;
        average_heartrate?: number;
        effort_score?: number;
    };
    icon?: any;
    color?: string;
    external_id?: string; // Strava activity ID for linking
    match?: WorkoutMatch; // Workout match data if available
    assignmentId?: string; // Training assignment ID for planned workouts
}

interface SessionListProps {
    sessions: SessionData[];
}

export function SessionList({ sessions }: SessionListProps) {
    const [selectedMatchAssignmentId, setSelectedMatchAssignmentId] = useState<string | null>(null);
    const [selectedMatchTitle, setSelectedMatchTitle] = useState<string>('');

    const formatDuration = (seconds: number) => {
        if (!seconds) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p>No hay sesiones para este día</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => {
                const CardContent = (
                    <Card key={session.id} className="overflow-hidden border-orange-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800">
                        {/* Header Strip */}
                        <div className="h-2 w-full bg-gradient-to-r from-orange-400 to-red-400" />

                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            {session.subtitle || 'Entrenamiento'}
                                        </p>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                            {session.title}
                                        </h3>
                                        {session.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                                {session.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {session.type === 'COMPLETED' && session.match?.matched && session.match.matchQuality && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setSelectedMatchAssignmentId(session.assignmentId || '');
                                                setSelectedMatchTitle(session.title);
                                            }}
                                            className="hover:scale-105 transition-transform"
                                        >
                                            <MatchQualityBadge score={session.match.matchQuality.overallScore} size="sm" />
                                        </button>
                                    )}
                                    {session.type === 'COMPLETED' && (
                                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30">
                                            Completado
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {session.type === 'COMPLETED' && session.stats && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    {/* Only show distance for non-weight training */}
                                    {session.subtitle !== 'WeightTraining' && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-400">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Distancia</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{((session.stats.distance || 0) / 1000).toFixed(2)} km</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-400">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Tiempo</p>
                                            <p className="font-bold text-gray-900 dark:text-white">{formatDuration(session.stats.duration || 0)}</p>
                                        </div>
                                    </div>

                                    {/* Only show pace for non-weight training */}
                                    {session.subtitle !== 'WeightTraining' && session.stats.pace && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-400">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Ritmo</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{session.stats.pace}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show heart rate if available - now for all workouts */}
                                    {session.stats.average_heartrate !== undefined && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-400">
                                                <Heart className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">FC Media</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{Math.round(session.stats.average_heartrate)} ppm</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show effort score if available - for all workouts */}
                                    {session.stats.effort_score !== undefined && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-400">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Effort Score</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{Math.round(session.stats.effort_score)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {session.subtitle !== 'WeightTraining' && session.stats.elevation !== undefined && session.stats.elevation > 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-gray-400">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Desnivel</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{Math.round(session.stats.elevation)} m</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {session.type === 'PLANNED' && (
                                <div className="flex items-center justify-between mt-3 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>~ {formatDuration(session.stats?.duration || 3600)}</span>
                                    </div>
                                    <span className="text-orange-500 font-medium cursor-pointer hover:underline">Ver detalles</span>
                                </div>
                            )}
                        </div>
                    </Card>
                );

                // Link to activity details for completed sessions
                if (session.type === 'COMPLETED' && session.external_id) {
                    return (
                        <Link key={session.id} href={`/activities/${session.external_id}`} className="block">
                            {CardContent}
                        </Link>
                    );
                }

                // Link to workout details for planned sessions
                if (session.type === 'PLANNED') {
                    return (
                        <Link key={session.id} href={`/workouts/${session.id}`} className="block cursor-pointer">
                            {CardContent}
                        </Link>
                    );
                }

                return CardContent;
            })}

            {/* Match Modal */}
            {selectedMatchAssignmentId && (
                <WorkoutMatchModal
                    isOpen={!!selectedMatchAssignmentId}
                    onClose={() => setSelectedMatchAssignmentId(null)}
                    assignmentId={selectedMatchAssignmentId}
                    workoutTitle={selectedMatchTitle}
                />
            )}
        </div>
    );
}
