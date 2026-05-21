'use client';

import { useTranslations } from 'next-intl';
import { isAxiosError } from 'axios';

export interface ApiErrorData {
    code: string;
    message: string;
    [key: string]: unknown;
}

export function useApiError() {
    const t = useTranslations('apiErrors');

    /**
     * Translates an error code from the API.
     * Falls back to the provided message or a generic error.
     */
    const translateError = (error: unknown): string => {
        if (isAxiosError(error)) {
            const data = error.response?.data as ApiErrorData;
            
            if (!data || !data.code) {
                return error.message || t('generic.REQUEST_FAILED');
            }

            const code = data.code;

            // Mapping logic to match the nested structure in es.json
            let translationKey = '';
            if (code.startsWith('AUTH_')) translationKey = `auth.${code.replace('AUTH_', '')}`;
            else if (code.startsWith('VALIDATION_')) translationKey = `validation.${code.replace('VALIDATION_', '')}`;
            else if (code.endsWith('_NOT_FOUND')) translationKey = `resources.${code}`;
            else if (code.startsWith('STRAVA_') || code.includes('_STRAVA_')) translationKey = `strava.${code}`;
            else if (code.startsWith('FAILED_TO_')) translationKey = `operations.${code}`;
            else translationKey = `generic.${code}`;

            try {
                // Check if the key exists by attempting to translate it
                // next-intl throws or returns the key if not found depending on config
                const translated = t(translationKey as any, data as any);
                if (translated !== translationKey) return translated;
            } catch {
                // Fallback handled below
            }

            // Specific fallback mappings for common legacy codes
            if (code === 'AUTH_FORBIDDEN') return t('auth.FORBIDDEN');
            if (code === 'AUTH_UNAUTHORIZED') return t('auth.UNAUTHORIZED');
            if (code === 'INTERNAL_SERVER_ERROR') return t('generic.INTERNAL_SERVER_ERROR');

            return data.message || t('generic.INTERNAL_SERVER_ERROR');
        }

        if (error instanceof Error) {
            return error.message;
        }

        return t('generic.INTERNAL_SERVER_ERROR');
    };

    return { translateError };
}
