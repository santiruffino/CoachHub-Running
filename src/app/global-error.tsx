'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import messages from '../../messages/es.json';

const t = messages.globalError;

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="es">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    backgroundColor: '#F2F2F2',
                    color: '#0A0A0A',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
            >
                <div
                    style={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem 1rem',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '32rem',
                            width: '100%',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-block',
                                alignSelf: 'center',
                                backgroundColor: '#FF6800',
                                color: '#FFFFFF',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                padding: '0.5rem 0.75rem',
                                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                            }}
                        >
                            {t.eyebrow}
                        </span>
                        <h1
                            style={{
                                fontSize: 'clamp(4rem, 12vw, 8rem)',
                                fontWeight: 700,
                                lineHeight: 0.85,
                                margin: 0,
                                color: '#FF6800',
                                textTransform: 'uppercase',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            500
                        </h1>
                        <h2
                            style={{
                                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                margin: 0,
                                lineHeight: 1.05,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {t.headline1}
                            <br />
                            {t.headline2}
                        </h2>
                        <p
                            style={{
                                margin: 0,
                                color: 'rgba(10, 10, 10, 0.6)',
                                fontSize: '0.875rem',
                                lineHeight: 1.5,
                            }}
                        >
                            {t.subtitle}
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.75rem',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                marginTop: '1rem',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.location.reload();
                                    }
                                }}
                                style={{
                                    backgroundColor: '#FF6800',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    padding: '1rem 2rem',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                }}
                            >
                                {t.primary}
                            </button>
                            <Link
                                href="/"
                                style={{
                                    border: '1px solid #0A0A0A',
                                    color: '#0A0A0A',
                                    backgroundColor: 'transparent',
                                    padding: '1rem 2rem',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                }}
                            >
                                {t.secondary}
                            </Link>
                        </div>
                        {error?.digest && (
                            <p
                                style={{
                                    fontSize: '9px',
                                    color: 'rgba(10, 10, 10, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    margin: 0,
                                    paddingTop: '1.5rem',
                                    borderTop: '1px solid rgba(10, 10, 10, 0.1)',
                                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                                }}
                            >
                                {t.errorId}: <span style={{ color: '#FF6800' }}>{error.digest}</span>
                            </p>
                        )}
                    </div>
                </div>
            </body>
        </html>
    );
}
