'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Unplug, Watch, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { DashboardCardHeaderDots } from '@/components/dashboard';
import { useGarminAuth } from '../hooks/useGarminAuth';
import { ConnectGarminDialog } from './ConnectGarminDialog';

const PAPER_BG = 'bg-endurix-paper dark:bg-card';

/**
 * Garmin integration card. Renders nothing unless the athlete is in the pilot
 * (status.available), so it stays invisible to everyone else.
 */
export function GarminStatusCard({ enabled }: { enabled: boolean }) {
    const { status, loading, connecting, error, connect, disconnect } = useGarminAuth({ enabled });
    const [dialogOpen, setDialogOpen] = useState(false);

    // Hidden entirely for non-pilot users (or while first load resolves to unavailable).
    if (!status?.available) return null;

    const isConnected = status.connected;
    const needsReauth = status.status === 'needs_reauth';

    return (
        <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
            <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                    <Watch className="h-4 w-4" />
                    Garmin
                    {isConnected && !needsReauth && (
                        <Badge variant="solid" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">Conectado</Badge>
                    )}
                    {needsReauth && (
                        <Badge variant="solid" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">Reconectar</Badge>
                    )}
                    {!isConnected && !needsReauth && (
                        <Badge variant="solid" className="bg-endurix-black/8 text-endurix-black/60 dark:bg-white/8 dark:text-muted-foreground border border-endurix-black/15 dark:border-border">Desconectado</Badge>
                    )}
                </CardTitle>
                <DashboardCardHeaderDots />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-6">
                <CardDescription>
                    Integración <strong>no oficial</strong> (piloto). Enviá tus entrenamientos al calendario
                    de tu Garmin y sincronizá tus actividades.
                </CardDescription>

                {needsReauth && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        La sesión de Garmin expiró. Reconectá para seguir enviando entrenamientos.
                    </div>
                )}

                {isConnected ? (
                    <div className="flex flex-wrap gap-4 items-center">
                        {needsReauth && (
                            <Button onClick={() => setDialogOpen(true)} disabled={loading}>
                                Reconectar
                            </Button>
                        )}
                        <Button
                            variant="outline-brand"
                            onClick={disconnect}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 border-red-500/30"
                        >
                            <Unplug className="mr-2 h-4 w-4" />
                            Desconectar
                        </Button>
                        {status.lastSyncedAt && (
                            <div className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                Últ. sync: {format(new Date(status.lastSyncedAt), 'PP p')}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <Button onClick={() => setDialogOpen(true)} disabled={loading}>
                            <Watch className="mr-2 h-4 w-4" />
                            Conectar Garmin
                        </Button>
                    </div>
                )}
            </CardContent>

            <ConnectGarminDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={connect}
                connecting={connecting}
                error={error}
            />
        </Card>
    );
}
