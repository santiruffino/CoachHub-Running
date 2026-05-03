'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStravaAuth } from '@/features/strava/hooks/useStravaAuth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Global set to track processed codes across Strict Mode remounts
const processedCodes = new Set<string>();

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Use the auth hook to get the current user
    const { user, loading: authLoading } = useAuth();
    const t = useTranslations('stravaAuth.callback');

    const { handleCallback, error: authError } = useStravaAuth();
    // We don't need local ref anymore for the code check, but can use it for local state if needed

    useEffect(() => {
        // If auth is done loading and we have no user, redirect to login
        if (!authLoading && !user) {
            console.error('No user found');
            router.push('/login');
            return;
        }

        // If we have a user and a code, proceed with callback
        // Check processedCodes to avoid double-call across remounts
        if (user && code) {
            if (processedCodes.has(code)) {
                return;
            }

            processedCodes.add(code);
            handleCallback(code);
        }
    }, [code, user, authLoading, handleCallback, router]);

    const displayError = error || authError;

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="mt-4 text-gray-600">{t('verifyingSession')}</p>
            </div>
        );
    }

    if (displayError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
                <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
                    <h1 className="text-xl font-bold mb-2">{t('connectionFailed')}</h1>
                    <p className="text-gray-600 mb-4">{displayError}</p>
                    <button
                        onClick={() => router.push('/profile')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-800 transition-colors"
                    >
                        {t('returnToProfile')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <p className="mt-4 text-gray-600">{t('connecting')}</p>
        </div>
    );
}

export default function StravaCallbackPage() {
    const t = useTranslations('stravaAuth.callback');

    return (
        <Suspense fallback={<div>{t('loading')}</div>}>
            <CallbackContent />
        </Suspense>
    );
}
