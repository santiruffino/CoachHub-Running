import { useState, useEffect, useCallback } from 'react';
import { stravaService, StravaConnectionStatus } from '../services/strava.service';
import { useRouter } from 'next/navigation';

export function useStravaAuth() {
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
        } catch (err) {
            console.error(err);
            setError('Failed to fetch Strava status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const connect = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { url } = await stravaService.getAuthUrl();
            // Redirect to Strava
            window.location.href = url;
        } catch (err: any) {
            console.error(err);
            setError('Failed to initiate connection');
            setLoading(false);
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            setLoading(true);
            await stravaService.disconnect();
            await fetchStatus(); // Refresh status
        } catch (err: any) {
            console.error(err);
            setError('Failed to disconnect');
            setLoading(false);
        }
    }, [fetchStatus]);

    const handleCallback = useCallback(async (code: string) => {
        try {
            setLoading(true);
            await stravaService.exchangeCode(code);
            router.push('/profile'); // Redirect back to profile page
        } catch (err: any) {
            console.error(err);
            setError('Failed to complete connection');
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
        } catch (err: any) {
            console.error(err);
            setError('Failed to sync activities');
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
