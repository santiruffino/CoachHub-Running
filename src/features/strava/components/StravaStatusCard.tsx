'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { RefreshCw, Unplug } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { StravaConnectionStatus } from '../services/strava.service';
import { ConnectStravaButton } from './ConnectStravaButton';
import { DashboardCardHeaderDots } from '@/components/dashboard';
import { cn } from '@/lib/utils';

interface StravaStatusCardProps {
    status: StravaConnectionStatus | null;
    loading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh: () => void;
    className?: string;
}

export function StravaStatusCard({ status, loading, onConnect, onDisconnect, onRefresh, className }: StravaStatusCardProps) {
    const t = useTranslations('strava.status');

    if (!status) {
        if (loading) return <div className="animate-pulse h-40 bg-endurix-black/5 dark:bg-white/5" />;

        return (
            <section className={cn('px-6 py-6', className)}>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                {t('integrationTitle')}
                            </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{t('connectDescription')}</p>
                    </div>
                    <div className="ml-auto shrink-0 pt-1">
                        <DashboardCardHeaderDots />
                    </div>
                </div>
                <div className="mt-4">
                    <ConnectStravaButton onConnect={onConnect} loading={loading} />
                </div>
            </section>
        );
    }

    return (
        <section className={cn('px-6 py-6', className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                            Strava
                        </h3>
                        <Badge
                            variant="solid"
                            className={status.isConnected
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-endurix-black/8 text-endurix-black/60 dark:bg-white/8 dark:text-muted-foreground border border-endurix-black/15 dark:border-border'}
                        >
                            {status.isConnected ? t('connected') : t('disconnected')}
                        </Badge>
                    </div>

                    {status.isConnected && (
                        <Image
                            src="/powered-by-strava-logos/pwrdBy_strava_orange/api_logo_pwrdBy_strava_horiz_orange.svg"
                            alt="Powered by Strava"
                            width={120}
                            height={30}
                            className="h-3.5 w-auto max-w-[84px] dark:hidden"
                        />
                    )}
                    {status.isConnected && (
                        <Image
                            src="/powered-by-strava-logos/pwrdBy_strava_white/api_logo_pwrdBy_strava_horiz_white.svg"
                            alt="Powered by Strava"
                            width={120}
                            height={30}
                            className="h-3.5 w-auto max-w-[84px] hidden dark:block"
                        />
                    )}

                    <p className="text-sm text-muted-foreground">
                        {status.isConnected
                            ? t('connectedAthleteId', { id: status.athleteId || '-' })
                            : t('connectAutoSync')}
                    </p>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2 pt-1">
                    {status.isConnected && (
                        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="text-endurix-orange hover:bg-endurix-orange/10">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                    <DashboardCardHeaderDots />
                </div>
            </div>

            {status.isConnected ? (
                <div className="mt-5 flex flex-wrap gap-4 items-center">
                    <Button variant="outline-brand" onClick={onDisconnect} disabled={loading} className="text-destructive hover:text-destructive border-destructive/30">
                        <Unplug className="mr-2 h-4 w-4" />
                        {t('disconnect')}
                    </Button>

                    {status.lastSync && (
                        <div className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground flex items-center" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('lastSync', { date: format(new Date(status.lastSync), 'PP p') })}
                        </div>
                    )}
                </div>
            ) : null}

            {(status.backfillStatus === 'queued' || status.backfillStatus === 'running') && (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                    {t('backfillInProgress')}
                </p>
            )}
            {status.backfillStatus === 'failed' && (
                <p className="mt-4 text-sm text-destructive">
                    {t('backfillFailed')}
                </p>
            )}

            {!status.isConnected && (
                <div className="mt-4">
                    <ConnectStravaButton onConnect={onConnect} loading={loading} />
                </div>
            )}
        </section>
    );
}
