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
import { matchingService } from '../services/matching.service';
import { Calendar, CheckCircle2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MatchCandidateAssignment } from '../types';
import { useLocale, useTranslations } from 'next-intl';

interface LinkWorkoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    activityId: string;
    activityTitle: string;
    onLinkSuccess?: () => void;
}

export function LinkWorkoutModal({ isOpen, onClose, activityId, activityTitle, onLinkSuccess }: LinkWorkoutModalProps) {
    const t = useTranslations('workouts.linkModal');
    const locale = useLocale();

    const [candidates, setCandidates] = useState<MatchCandidateAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchCandidates = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await matchingService.getCandidateAssignments(activityId);
            setCandidates(data);
        } catch (err) {
            appLogger.error('Failed to load candidates', err);
            setError(t('errorLoad')); 
        } finally {
            setLoading(false);
        }
    }, [activityId, t]);

    useEffect(() => {
        if (isOpen && activityId) {
            fetchCandidates();
        }
    }, [isOpen, activityId, fetchCandidates]);

    const handleLink = async (assignmentId: string) => {
        try {
            setActionLoading(assignmentId);
            await matchingService.linkActivity(assignmentId, activityId);
            await fetchCandidates(); // Refresh list to update status
            if (onLinkSuccess) onLinkSuccess();
        } catch (err) {
            appLogger.error('Failed to link', err);
            setError(t('errorLink'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnlink = async (assignmentId: string) => {
        if (!confirm(t('confirmUnlink'))) return;
        try {
            setActionLoading(assignmentId);
            await matchingService.unlinkActivity(assignmentId);
            await fetchCandidates(); // Refresh list to update status
            if (onLinkSuccess) onLinkSuccess();
        } catch (err) {
            appLogger.error('Failed to unlink', err);
            setError(t('errorUnlink'));
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-white/15">
                <DialogHeader className="border-b border-endurix-black/10 dark:border-border">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                        <LinkIcon className="w-5 h-5 text-endurix-orange" />
                        {t('title')}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {t('activityLabel')}: <span className="font-bold text-endurix-black dark:text-foreground">{activityTitle}</span>
                    </p>
                </DialogHeader>

                {error && (
                    <div className="p-3 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30 text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-12 text-center text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        {t('loading')}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {candidates.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <p>{t('noCandidates')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {candidates.map(assignment => (
                                    <div
                                        key={assignment.id}
                                        className={`p-4 border flex items-center justify-between ${assignment.isLinkedToThis ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-white/15 hover:border-endurix-orange'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base text-endurix-black dark:text-foreground uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                                    {assignment.title}
                                                </span>
                                                {assignment.isLinkedToThis && (
                                                        <Badge variant="solid" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15 flex items-center gap-1 text-[10px] uppercase tracking-widest">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {t('linked')}
                                                        </Badge>
                                                    )}
                                                    {assignment.isLinked && !assignment.isLinkedToThis && (
                                                        <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase tracking-widest flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {t('linkedToAnother')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-endurix-orange" />
                                                    {new Date(assignment.scheduledDate).toLocaleDateString(locale)}
                                                </div>
                                                {assignment.type && (
                                                    <Badge variant="outline" className="text-[10px] py-0 h-5 uppercase tracking-widest">
                                                        {assignment.type}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ml-4">
                                            {assignment.isLinkedToThis ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline-brand"
                                                    onClick={() => handleUnlink(assignment.id)}
                                                    disabled={actionLoading === assignment.id}
                                                    className="text-red-600 hover:text-red-700 border-red-500/30 hover:bg-red-500/10 uppercase tracking-widest text-[10px]"
                                                >
                                                    {actionLoading === assignment.id ? t('unlinking') : t('unlink')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant={assignment.isLinked ? "outline-brand" : "orange"}
                                                    onClick={() => handleLink(assignment.id)}
                                                    disabled={actionLoading === assignment.id || (assignment.isLinked && !assignment.isLinkedToThis)}
                                                    className={`${assignment.isLinked ? "opacity-50" : ""} uppercase tracking-widest text-[10px]`}
                                                >
                                                    {actionLoading === assignment.id ? t('linking') : t('link')}
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
