'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { matchingService } from '../services/matching.service';
import { Calendar, CheckCircle2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LinkWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    activityId: string;
    activityTitle: string;
    onLinkSuccess?: () => void;
}

export function LinkWorkoutModal({ isOpen, onClose, activityId, activityTitle, onLinkSuccess }: LinkWorkoutModalProps) {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && activityId) {
            fetchCandidates();
        }
    }, [isOpen, activityId]);

    const fetchCandidates = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await matchingService.getCandidateAssignments(activityId);
            setCandidates(data);
        } catch (err) {
            console.error('Failed to load candidates', err);
            setError('No se pudieron cargar los entrenamientos sugeridos');
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async (assignmentId: string) => {
        try {
            setActionLoading(assignmentId);
            await matchingService.linkActivity(assignmentId, activityId);
            await fetchCandidates(); // Refresh list to update status
            if (onLinkSuccess) onLinkSuccess();
        } catch (err) {
            console.error('Failed to link', err);
            setError('No se pudo vincular el entrenamiento');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnlink = async (assignmentId: string) => {
        if (!confirm('¿Estás seguro de que quieres desvincular este entrenamiento?')) return;
        try {
            setActionLoading(assignmentId);
            await matchingService.unlinkActivity(assignmentId);
            await fetchCandidates(); // Refresh list to update status
            if (onLinkSuccess) onLinkSuccess();
        } catch (err) {
            console.error('Failed to unlink', err);
            setError('No se pudo desvincular el entrenamiento');
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Vincular con Entrenamiento Planificado
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Actividad: <span className="font-medium text-foreground">{activityTitle}</span>
                    </p>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground">
                        Buscando entrenamientos cercanos...
                    </div>
                ) : (
                    <div className="space-y-4">
                        {candidates.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <p>No se encontraron entrenamientos planificados cercanos (+/- 2 días).</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {candidates.map(assignment => (
                                    <div
                                        key={assignment.id}
                                        className={`p-4 border rounded-lg flex items-center justify-between ${assignment.isLinkedToThis ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'hover:bg-accent/50'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-base">
                                                    {assignment.title}
                                                </span>
                                                {assignment.isLinkedToThis && (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1 text-xs">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Vinculado
                                                    </Badge>
                                                )}
                                                {assignment.isLinked && !assignment.isLinkedToThis && (
                                                    <Badge variant="outline" className="text-muted-foreground text-xs flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Vinculado a otra actividad
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(assignment.scheduledDate).toLocaleDateString()}
                                                </div>
                                                {assignment.type && (
                                                    <Badge variant="outline" className="text-xs py-0 h-5">
                                                        {assignment.type}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ml-4">
                                            {assignment.isLinkedToThis ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleUnlink(assignment.id)}
                                                    disabled={actionLoading === assignment.id}
                                                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                                >
                                                    {actionLoading === assignment.id ? 'Desvinculando...' : 'Desvincular'}
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant={assignment.isLinked ? "outline" : "default"}
                                                    onClick={() => handleLink(assignment.id)}
                                                    disabled={actionLoading === assignment.id || (assignment.isLinked && !assignment.isLinkedToThis)}
                                                    className={assignment.isLinked ? "opacity-50" : ""}
                                                >
                                                    {actionLoading === assignment.id ? 'Vinculando...' : 'Vincular'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
