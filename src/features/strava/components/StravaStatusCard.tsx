import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StravaConnectionStatus } from '../services/strava.service';
import { ConnectStravaButton } from './ConnectStravaButton';
import { format } from 'date-fns';
import { RefreshCw, Unplug } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { DashboardCardHeaderDots } from '@/components/dashboard';

interface StravaStatusCardProps {
    status: StravaConnectionStatus | null;
    loading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh: () => void; // This prop is intended to trigger a manual sync
}

const PAPER_BG = 'bg-endurix-paper dark:bg-card';

export function StravaStatusCard({ status, loading, onConnect, onDisconnect, onRefresh }: StravaStatusCardProps) {
    const t = useTranslations('strava.status');

    if (!status) {
        if (loading) return <div className="animate-pulse h-40 bg-endurix-black/5 dark:bg-white/5"></div>;
        // If fetching failed or not initialized, show connect generic
        return (
            <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('integrationTitle')}</CardTitle>
                    <DashboardCardHeaderDots />
                </CardHeader>
                <CardContent className="p-6">
                    <CardDescription className="mb-4">{t('connectDescription')}</CardDescription>
                    <ConnectStravaButton onConnect={onConnect} loading={loading} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
            <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-2">
                        <CardTitle className="flex items-center gap-2 text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                            Strava
                            {status.isConnected ?
                                <Badge variant="solid" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">{t('connected')}</Badge> :
                                <Badge variant="solid" className="bg-endurix-black/8 text-endurix-black/60 dark:bg-white/8 dark:text-muted-foreground border border-endurix-black/15 dark:border-border">{t('disconnected')}</Badge>
                            }
                        </CardTitle>
                        {status.isConnected && (
                            <>
                                {/* Orange logo for light mode */}
                                <Image
                                    src="/powered-by-strava-logos/pwrdBy_strava_orange/api_logo_pwrdBy_strava_horiz_orange.svg"
                                    alt="Powered by Strava"
                                    width={120}
                                    height={30}
                                    className="h-6 w-auto dark:hidden"
                                />
                                {/* White logo for dark mode */}
                                <Image
                                    src="/powered-by-strava-logos/pwrdBy_strava_white/api_logo_pwrdBy_strava_horiz_white.svg"
                                    alt="Powered by Strava"
                                    width={120}
                                    height={30}
                                    className="h-6 w-auto hidden dark:block"
                                />
                            </>
                        )}
                    </div>
                    {status.isConnected && (
                        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="text-endurix-orange hover:bg-endurix-orange/10">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                </div>
                <CardDescription>
                    {status.isConnected
                        ? t('connectedAthleteId', { id: status.athleteId || '-' })
                        : t('connectAutoSync')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-6">
                {status.isConnected ? (
                    <div className="flex gap-4 items-center">
                        <Button variant="outline-brand" onClick={onDisconnect} disabled={loading} className="text-red-600 hover:text-red-700 dark:text-red-400 border-red-500/30">
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
                    <CardDescription className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                        {t('backfillInProgress')}
                    </CardDescription>
                )}
                {status.backfillStatus === 'failed' && (
                    <CardDescription className="text-red-600 dark:text-red-400">
                        {t('backfillFailed')}
                    </CardDescription>
                )}

                {!status.isConnected && (
                    <ConnectStravaButton onConnect={onConnect} loading={loading} />
                )}
            </CardContent>
        </Card>
    );
}
