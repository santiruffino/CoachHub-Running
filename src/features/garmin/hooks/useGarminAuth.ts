import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useTranslations } from 'next-intl';
import { appLogger } from '@/lib/app-logger';
import { garminService, GarminStatus } from '../services/garmin.service';

interface ApiErrorResponse {
    error?: string;
    message?: string;
    data?: { mfa?: boolean };
}

export function useGarminAuth(options?: { enabled?: boolean }) {
    const enabled = options?.enabled ?? true;
    const t = useTranslations('garmin.errors');
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
            setError(t('fetchStatus'));
        } finally {
            setLoading(false);
        }
    }, [t]);

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
                setError(payload?.message || payload?.error || t('connect'));
                return false;
            } finally {
                setConnecting(false);
            }
        },
        [fetchStatus, t],
    );

    const disconnect = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            await garminService.disconnect();
            await fetchStatus();
        } catch (err: unknown) {
            appLogger.error(err);
            setError(t('disconnect'));
        } finally {
            setLoading(false);
        }
    }, [fetchStatus, t]);

    return { status, loading, connecting, error, connect, disconnect, refresh: fetchStatus };
}
