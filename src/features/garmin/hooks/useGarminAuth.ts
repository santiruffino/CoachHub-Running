import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { appLogger } from '@/lib/app-logger';
import { garminService, GarminStatus } from '../services/garmin.service';

interface ApiErrorResponse {
    error?: string;
    message?: string;
    data?: { mfa?: boolean };
}

export function useGarminAuth(options?: { enabled?: boolean }) {
    const enabled = options?.enabled ?? true;
    const [status, setStatus] = useState<GarminStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const data = await garminService.getStatus();
            setStatus(data);
            setError(null);
        } catch (err: unknown) {
            appLogger.error(err);
            setError('No se pudo obtener el estado de Garmin');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (enabled) fetchStatus();
    }, [enabled, fetchStatus]);

    const connect = useCallback(
        async (username: string, password: string, consent: boolean): Promise<boolean> => {
            try {
                setConnecting(true);
                setError(null);
                await garminService.connect(username, password, consent);
                await fetchStatus();
                return true;
            } catch (err: unknown) {
                appLogger.error(err);
                const payload = (err as AxiosError<ApiErrorResponse>)?.response?.data;
                setError(payload?.message || payload?.error || 'No se pudo conectar con Garmin');
                return false;
            } finally {
                setConnecting(false);
            }
        },
        [fetchStatus],
    );

    const disconnect = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await garminService.disconnect();
            await fetchStatus();
        } catch (err: unknown) {
            appLogger.error(err);
            setError('No se pudo desconectar Garmin');
        } finally {
            setLoading(false);
        }
    }, [fetchStatus]);

    return { status, loading, connecting, error, connect, disconnect, refresh: fetchStatus };
}
