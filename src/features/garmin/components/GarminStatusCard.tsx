'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Unplug, Watch, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardCardHeaderDots } from '@/components/dashboard';
import { useGarminAuth } from '../hooks/useGarminAuth';
import { ConnectGarminDialog } from './ConnectGarminDialog';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function GarminStatusCard({ enabled, className }: { enabled: boolean; className?: string }) {
    const t = useTranslations('garmin');
    const { status, loading, connecting, error, connect, disconnect } = useGarminAuth({ enabled });
    const [dialogOpen, setDialogOpen] = useState(false);

    if (!status?.available) return null;

    const isConnected = status.connected;
    const needsReauth = status.status === 'needs_reauth';

    return (
        <section className={cn('px-4 sm:px-6 py-4 sm:py-6', className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="flex items-center gap-2 text-base uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                            <Watch className="h-4 w-4" />
                            {t('title')}
                        </h3>
                        {isConnected && !needsReauth && (
                            <Badge variant="solid" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">{t('status.connected')}</Badge>
                        )}
                        {needsReauth && (
                            <Badge variant="solid" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">{t('status.needsReauth')}</Badge>
                        )}
                        {!isConnected && !needsReauth && (
                            <Badge variant="solid" className="bg-endurix-black/8 text-endurix-black/60 dark:bg-white/8 dark:text-muted-foreground border border-endurix-black/15 dark:border-border">{t('status.disconnected')}</Badge>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {t.rich('cardDescription', { strong: (chunks) => <strong>{chunks}</strong> })}
                    </p>

                    {needsReauth && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {t('reauthWarning')}
                        </div>
                    )}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2 pt-1">
                    <DashboardCardHeaderDots />
                </div>
            </div>

            {isConnected ? (
                <div className="mt-5 flex flex-wrap gap-4 items-center">
                    {needsReauth && (
                        <Button onClick={() => setDialogOpen(true)} disabled={loading}>
                            {t('reconnectBtn')}
                        </Button>
                    )}
                    <Button
                        variant="outline-brand"
                        onClick={disconnect}
                        disabled={loading}
                        className="text-destructive hover:text-destructive border-destructive/30"
                    >
                        <Unplug className="mr-2 h-4 w-4" />
                        {t('disconnectBtn')}
                    </Button>
                    {status.lastSyncedAt && (
                        <div className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('lastSync', { date: format(new Date(status.lastSyncedAt), 'PP p') })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-5">
                    <Button onClick={() => setDialogOpen(true)} disabled={loading}>
                        <Watch className="mr-2 h-4 w-4" />
                        {t('connectBtn')}
                    </Button>
                </div>
            )}

            <ConnectGarminDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={connect}
                connecting={connecting}
                error={error}
            />
        </section>
    );
}
