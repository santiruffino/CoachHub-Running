import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StravaConnectionStatus } from '../services/strava.service';
import { ConnectStravaButton } from './ConnectStravaButton';
import { format } from 'date-fns';
import { RefreshCw, Unplug } from 'lucide-react';
import Image from 'next/image';

interface StravaStatusCardProps {
    status: StravaConnectionStatus | null;
    loading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh: () => void; // This prop is intended to trigger a manual sync
}

export function StravaStatusCard({ status, loading, onConnect, onDisconnect, onRefresh }: StravaStatusCardProps) {
    if (!status) {
        if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-lg"></div>;
        // If fetching failed or not initialized, show connect generic
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Integracion con Strava</CardTitle>
                    <CardDescription>Conecta tu cuenta de Strava para sincronizar tus actividades.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ConnectStravaButton onConnect={onConnect} loading={loading} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-2">
                        <CardTitle className="flex items-center gap-2">
                            Strava
                            {status.isConnected ?
                                <Badge className="bg-green-500 hover:bg-green-600">Conectado</Badge> :
                                <Badge variant="secondary">Sin conexion</Badge>
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
                        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                </div>
                <CardDescription>
                    {status.isConnected
                        ? `Conectado al atleta con ID: ${status.athleteId}`
                        : 'Conecta tu cuenta para sincronizar las actividades automaticamente.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {status.isConnected ? (
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={onDisconnect} disabled={loading} className="text-red-500 hover:text-red-600">
                            <Unplug className="mr-2 h-4 w-4" />
                            Desconectar
                        </Button>

                        {status.lastSync && (
                            <div className="text-sm text-gray-500 flex items-center">
                                Ultima sincronizacion: {format(new Date(status.lastSync), 'PP p')}
                            </div>
                        )}
                    </div>
                ) : (
                    <ConnectStravaButton onConnect={onConnect} loading={loading} />
                )}
            </CardContent>
        </Card>
    );
}
