import { useState, useEffect, useCallback } from 'react';
import { stravaService, StravaConnectionStatus } from '../services/strava.service';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
    error?: string;
}

export function useStravaAuth(options?: { enabled?: boolean }) {
    const enabled = options?.enabled ?? true;
    const [status, setStatus] = useState<StravaConnectionStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const data = await stravaService.getStatus();
            setStatus(data);
            setError(null);
        } catch (err: unknown) {
            console.error(err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.error;
            setError(message || 'Failed to fetch Strava status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            fetchStatus();
        }
    }, [fetchStatus, enabled]);

    const connect = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { url } = await stravaService.getAuthUrl();
            // Redirect to Strava
            window.location.href = url;
        } catch (err: unknown) {
            console.error(err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.error;
            setError(message || 'Failed to initiate connection');
            setLoading(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            setLoading(true);
            await stravaService.disconnect();
            await fetchStatus(); // Refresh status
        } catch (err: unknown) {
            console.error(err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.error;
            setError(message || 'Failed to disconnect');
            setLoading(false);
        }
    }, [fetchStatus]);

    const handleCallback = useCallback(async (code: string) => {
        try {
            setLoading(true);
            await stravaService.exchangeCode(code);
            router.push('/profile'); // Redirect back to profile page
        } catch (err: unknown) {
            console.error(err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.error;
            setError(message || 'Failed to complete connection');
        } finally {
            setLoading(false);
        }
    }, [router]);

    const sync = useCallback(async () => {
        try {
            setLoading(true);
            const result = await stravaService.sync();
            // Optionally fetch status again to update "lastSync"
            await fetchStatus();
            return result;
        } catch (err: unknown) {
            console.error(err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.error;
            setError(message || 'Failed to sync activities');
            setLoading(false);
        }
    }, [fetchStatus]);

    return {
        status,
        loading,
        error,
        connect,
        disconnect,
        handleCallback,
        refreshStatus: fetchStatus,
        sync
    };
}
