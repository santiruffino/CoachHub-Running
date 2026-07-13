'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Copy, ClipboardPaste, X, Loader2 } from 'lucide-react';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useApiError } from '@/hooks/useApiError';
import { appLogger } from '@/lib/app-logger';
import { plansService } from '../services/plans.service';
import { getWeekClipboard, setWeekClipboard, clearWeekClipboard, type WeekClipboard } from '../utils/weekClipboard';

const MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;

interface WeekClipboardControlsProps {
    /** The athlete whose week is shown (copy source / paste target). */
    sourceUserId: string;
    /** Monday of the currently visible week, yyyy-MM-dd. */
    weekStartStr: string;
    /** Athlete name for the clipboard label. */
    athleteLabel?: string;
}

/**
 * Coach-only "copy week / paste week" controls for the athlete calendar.
 * Copies the visible week to a sessionStorage clipboard, then lets the coach
 * paste it onto the visible week (of this or any other athlete).
 */
export function WeekClipboardControls({ sourceUserId, weekStartStr, athleteLabel }: WeekClipboardControlsProps) {
    const t = useTranslations('calendar');
    const router = useRouter();
    const { translateError } = useApiError();
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const [clip, setClip] = useState<WeekClipboard | null>(null);
    const [pasting, setPasting] = useState(false);

    useEffect(() => {
        const sync = () => setClip(getWeekClipboard());
        sync();
        window.addEventListener('endurix:weekclipboard', sync);
        return () => window.removeEventListener('endurix:weekclipboard', sync);
    }, []);

    const handleCopy = () => {
        setWeekClipboard({
            sourceUserId,
            weekStart: weekStartStr,
            label: athleteLabel || weekStartStr,
        });
        showAlert('success', t('weekCopied'));
    };

    const handlePaste = async () => {
        if (!clip) return;
        try {
            setPasting(true);
            const res = await plansService.copyWeek({
                sourceUserId: clip.sourceUserId,
                sourceWeekStart: clip.weekStart,
                targetWeekStart: weekStartStr,
                targetAthleteIds: [sourceUserId],
            });
            showAlert('success', `${res.data.assignmentCount} · ${t('weekPasted')}`);
            router.refresh();
        } catch (error) {
            appLogger.error('Failed to paste week:', error);
            showAlert('error', translateError(error));
        } finally {
            setPasting(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="h-8 px-3 border border-endurix-black/10 dark:border-border text-[10px] font-bold uppercase tracking-widest hover:border-endurix-orange/40 transition-colors flex items-center gap-1.5"
                    style={MONO}
                    title={t('copyWeek')}
                >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('copyWeek')}</span>
                </button>

                {clip && (
                    <>
                        <button
                            type="button"
                            onClick={handlePaste}
                            disabled={pasting}
                            className="h-8 px-3 border border-endurix-orange/40 text-endurix-orange text-[10px] font-bold uppercase tracking-widest hover:bg-endurix-orange/10 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                            style={MONO}
                            title={t('pasteWeek')}
                        >
                            {pasting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{t('pasteWeek')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => clearWeekClipboard()}
                            className="h-8 w-8 border border-endurix-black/10 dark:border-border flex items-center justify-center hover:border-endurix-orange/40 transition-colors"
                            title={t('clearClipboard')}
                            aria-label={t('clearClipboard')}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
            </div>

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </>
    );
}
