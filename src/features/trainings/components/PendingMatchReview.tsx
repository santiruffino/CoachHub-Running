'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { matchingService, PendingMatch } from '@/features/trainings/services/matching.service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatDistance(meters: number): string {
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(value));
}

export function PendingMatchReview() {
    const [matches, setMatches] = useState<PendingMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            const data = await matchingService.getPendingReview();
            setMatches(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const handleResolve = async (assignmentId: string, action: 'approve' | 'reject') => {
        try {
            setResolvingId(assignmentId);
            await matchingService.resolveMatch(assignmentId, action);
            setMatches((prev) => prev.filter((match) => match.assignmentId !== assignmentId));
        } catch (error) {
            appLogger.error('Failed to resolve pending match:', error);
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    if (matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No hay matches pendientes de revisión.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-endurix-black/8 dark:divide-border">
            {matches.map((match) => (
                <div key={match.assignmentId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-endurix-orange" />
                            <p className="text-sm font-semibold text-endurix-black dark:text-foreground">
                                {match.athleteName} — {match.workoutName}
                            </p>
                            <span className="rounded-full bg-endurix-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {match.confidence}% confianza
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Planificado: {formatDate(match.scheduledDate)}
                            {match.candidateActivity && (
                                <>
                                    {' · '}Actividad sugerida: {match.candidateActivity.title} ({formatDistance(match.candidateActivity.distance)}, {formatDuration(match.candidateActivity.duration)})
                                </>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline-brand"
                            size="sm"
                            disabled={resolvingId === match.assignmentId}
                            onClick={() => void handleResolve(match.assignmentId, 'reject')}
                            className="gap-1.5"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Rechazar
                        </Button>
                        <Button
                            type="button"
                            variant="orange"
                            size="sm"
                            disabled={resolvingId === match.assignmentId}
                            onClick={() => void handleResolve(match.assignmentId, 'approve')}
                            className="gap-1.5"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprobar
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
