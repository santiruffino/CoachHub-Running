'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';

const easeOut = [0.22, 1, 0.36, 1] as const;

function HeartbeatPulse({ on }: { on: boolean }) {
    return (
        <svg viewBox="0 0 100 12" className="w-full max-w-xs h-3" preserveAspectRatio="none">
            <motion.path
                d="M 0 6 L 18 6 L 22 2 L 26 10 L 30 4 L 36 6 L 50 6 L 54 2 L 58 10 L 62 4 L 68 6 L 100 6"
                fill="none"
                stroke="var(--endurix-orange, #FF6800)"
                strokeWidth="1.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={
                    on
                        ? { pathLength: 1, opacity: 1 }
                        : { pathLength: 0, opacity: 0.3 }
                }
                transition={{
                    pathLength: { duration: 1.4, ease: easeOut, repeat: Infinity, repeatDelay: 0.4 },
                    opacity: { duration: 0.4 },
                }}
            />
        </svg>
    );
}

export default function GlobalErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const t = useTranslations('errorPage');
    const [retrying, setRetrying] = useState(false);
    const [errorId] = useState(() =>
        error.digest ?? `ERR-${Date.now().toString(36).toUpperCase().slice(-6)}`
    );

    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.error('App error:', error);
        }
        Sentry.captureException(error);
    }, [error]);

    const handleRetry = () => {
        setRetrying(true);
        setTimeout(() => {
            reset();
            setRetrying(false);
        }, 350);
    };

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background flex items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none"
                aria-hidden
                style={{
                    backgroundImage:
                        'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.92, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: -4 }}
                transition={{ duration: 0.6, ease: easeOut, delay: 0.4 }}
                className="absolute top-16 right-16 w-20 h-20 bg-endurix-orange hidden md:block"
                aria-hidden
            />

            <div className="relative max-w-2xl w-full text-center space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: easeOut }}
                >
                    <span
                        className="inline-flex items-center gap-2 bg-endurix-orange text-white text-[10px] font-bold tracking-widest px-3 py-1.5"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        <AlertOctagon className="w-3 h-3" />
                        {t('eyebrow')}
                    </span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: easeOut, delay: 0.1 }}
                    className="font-bold text-endurix-black dark:text-foreground uppercase leading-[0.85] tracking-tight"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    <span className="block text-[7rem] sm:text-[9rem] lg:text-[11rem] text-endurix-orange">
                        500
                    </span>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: easeOut, delay: 0.25 }}
                    className="font-bold text-endurix-black dark:text-foreground text-3xl sm:text-4xl lg:text-5xl uppercase leading-[1.05] tracking-tight"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    <span className="block">{t('headline1')}</span>
                    <span className="block text-endurix-orange">{t('headline2')}</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: easeOut, delay: 0.4 }}
                    className="text-endurix-black/60 dark:text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto"
                >
                    {t('subtitle')}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="flex flex-col items-center gap-2"
                >
                    <HeartbeatPulse on={!retrying} />
                    <span
                        className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-widest"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        {t('label')}: <span className="text-endurix-orange">{errorId}</span>
                    </span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: easeOut, delay: 0.7 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
                >
                    <motion.button
                        type="button"
                        onClick={handleRetry}
                        disabled={retrying}
                        whileHover={!retrying ? { y: -2 } : undefined}
                        whileTap={!retrying ? { scale: 0.98 } : undefined}
                        className="inline-flex items-center justify-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-8 py-4 transition-all hover:bg-endurix-orange/90 disabled:opacity-60 w-full sm:w-auto"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                        {t('primary')}
                    </motion.button>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                        <BackButton href="/" label={t('secondary')} showLabel variant="outline" className="w-full sm:w-auto" />
                    </motion.div>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.95 }}
                    className="text-[10px] text-endurix-black/40 dark:text-muted-foreground tracking-widest uppercase pt-6 border-t border-endurix-black/10 dark:border-border max-w-md mx-auto"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {t('helpText')}
                </motion.p>
            </div>
        </div>
    );
}
