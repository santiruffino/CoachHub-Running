'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Clock, MapPin, TrendingUp, Heart, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MatchQualityBadge } from '@/features/trainings/components/MatchQualityBadge';
import { WorkoutMatchModal } from '@/features/trainings/components/WorkoutMatchModal';
import { WorkoutMatch } from '@/interfaces/training';
import { useTranslations } from 'next-intl';

interface SessionIcon {
    name: string;
}

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
    icon?: SessionIcon;
    color?: string;
    activity_id?: string; // Internal activity UUID for linking
    match?: WorkoutMatch; // Workout match data if available
    assignmentId?: string; // Training assignment ID for planned workouts
}

interface SessionListProps {
    sessions: SessionData[];
}

export function SessionList({ sessions }: SessionListProps) {
    const t = useTranslations('calendar.sessionList');

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
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-endurix-paper dark:bg-card border border-dashed border-endurix-black/15 dark:border-white/15">
                <Activity className="w-10 h-10 mb-2 opacity-20" />
                <p>{t('empty')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => {
                const CardContent = (
                    <Card key={session.id} className="overflow-hidden border-endurix-black/10 dark:border-border hover:border-endurix-orange/40 transition-colors bg-endurix-paper dark:bg-card">
                        {/* Header Strip */}
                        <div className="h-1 w-full bg-endurix-orange" />

                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-endurix-orange/10 text-endurix-orange">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p
                                            className="text-xs font-semibold text-muted-foreground uppercase tracking-widest"
                                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                        >
                                            {session.subtitle || t('workout')}
                                        </p>
                                        <h3
                                            className="text-lg font-bold text-endurix-black dark:text-foreground leading-tight uppercase tracking-tight"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {session.title}
                                        </h3>
                                        {session.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/30">
                                            {t('completed')}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {session.type === 'COMPLETED' && session.stats && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-endurix-black/10 dark:border-border">
                                    {/* Only show distance for non-weight training */}
                                    {session.subtitle !== 'WeightTraining' && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-endurix-black/8 dark:bg-white/10 text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p
                                                    className="text-xs text-muted-foreground uppercase tracking-wider"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {t('distance')}
                                                </p>
                                                <p
                                                    className="font-bold text-endurix-black dark:text-foreground tabular-nums"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {((session.stats.distance || 0) / 1000).toFixed(2)} km
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-endurix-black/8 dark:bg-white/10 text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p
                                                className="text-xs text-muted-foreground uppercase tracking-wider"
                                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                            >
                                                {t('time')}
                                            </p>
                                            <p
                                                className="font-bold text-endurix-black dark:text-foreground tabular-nums"
                                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                            >
                                                {formatDuration(session.stats.duration || 0)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Only show pace for non-weight training */}
                                    {session.subtitle !== 'WeightTraining' && session.stats.pace && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-endurix-black/8 dark:bg-white/10 text-muted-foreground">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p
                                                    className="text-xs text-muted-foreground uppercase tracking-wider"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {t('pace')}
                                                </p>
                                                <p
                                                    className="font-bold text-endurix-black dark:text-foreground tabular-nums"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {session.stats.pace}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show heart rate if available - now for all workouts */}
                                    {session.stats.average_heartrate !== undefined && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-endurix-black/8 dark:bg-white/10 text-muted-foreground">
                                                <Heart className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p
                                                    className="text-xs text-muted-foreground uppercase tracking-wider"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {t('avgHr')}
                                                </p>
                                                <p
                                                    className="font-bold text-endurix-black dark:text-foreground tabular-nums"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {Math.round(session.stats.average_heartrate)} ppm
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show effort score if available - for all workouts */}
                                    {session.stats.effort_score !== undefined && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-endurix-black/8 dark:bg-white/10 text-muted-foreground">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p
                                                    className="text-xs text-muted-foreground uppercase tracking-wider"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {t('effortScore')}
                                                </p>
                                                <p
                                                    className="font-bold text-endurix-black dark:text-foreground tabular-nums"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {Math.round(session.stats.effort_score)}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {session.subtitle !== 'WeightTraining' && session.stats.elevation !== undefined && session.stats.elevation > 0 && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-endurix-black/8 dark:bg-white/10 text-muted-foreground">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p
                                                    className="text-xs text-muted-foreground uppercase tracking-wider"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {t('elevation')}
                                                </p>
                                                <p
                                                    className="font-bold text-endurix-black dark:text-foreground tabular-nums"
                                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                >
                                                    {Math.round(session.stats.elevation)} m
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {session.type === 'PLANNED' && (
                                <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span
                                            className="tabular-nums"
                                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                        >
                                            ~ {formatDuration(session.stats?.duration || 3600)}
                                        </span>
                                    </div>
                                    <span
                                        className="text-endurix-orange font-semibold cursor-pointer hover:underline uppercase tracking-widest text-[10px]"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {t('viewDetails')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                );

                // Link to activity details for completed sessions
                if (session.type === 'COMPLETED' && session.activity_id) {
                    return (
                        <Link key={session.id} href={`/activities/${session.activity_id}`} className="block">
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
