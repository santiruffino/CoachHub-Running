import * as Sentry from '@sentry/nextjs';

type HandledErrorContext = {
    event?: string;
    runtime?: 'server' | 'edge' | 'client';
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
};

function toError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    if (typeof error === 'string') {
        return new Error(error);
    }

    try {
        return new Error(JSON.stringify(error));
    } catch {
        return new Error('Handled error');
    }
}

export function reportHandledError(error: unknown, context: HandledErrorContext = {}) {
    if (typeof window !== 'undefined') {
        return;
    }

    const capturedError = toError(error);

    Sentry.captureException(capturedError, {
        tags: {
            handled: 'true',
            runtime: context.runtime || 'server',
            ...(context.tags || {}),
        },
        extra: {
            event: context.event,
            ...(context.extra || {}),
        },
    });
}
