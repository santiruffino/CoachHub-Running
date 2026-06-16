'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowRight, Compass } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';

function AnimatedTicker() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const start = performance.now();
        const duration = 1800;
        let raf = 0;
        const tick = (now: number) => {
            const elapsed = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - elapsed, 3);
            setProgress(eased);
            if (elapsed < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div className="flex items-center gap-2 w-full max-w-xs">
            <span
                className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-widest"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                0:00
            </span>
            <div className="flex-1 h-1 bg-endurix-black/15 dark:bg-border relative overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-endurix-orange"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>
            <span
                className="text-[9px] text-endurix-orange tracking-widest"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                ?
            </span>
        </div>
    );
}

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function NotFound() {
    const t = useTranslations('notFound');

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background flex items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
            {/* Decorative grid backdrop */}
            <div
                className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none"
                aria-hidden
                style={{
                    backgroundImage:
                        'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    color: 'var(--font-exo-2, currentColor)',
                }}
            />

            {/* Decorative orange offset block */}
            <motion.div
                initial={{ opacity: 0, x: 32, y: 32 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.7, ease: easeOut, delay: 0.55 }}
                className="absolute bottom-12 right-12 w-24 h-24 bg-endurix-orange hidden md:block"
                aria-hidden
            />

            <div className="relative max-w-2xl w-full text-center space-y-8">
                {/* Eyebrow badge */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: easeOut }}
                >
                    <span
                        className="inline-flex items-center gap-2 bg-endurix-black dark:bg-white text-white dark:text-endurix-black text-[10px] font-bold tracking-widest px-3 py-1.5"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        <Compass className="w-3 h-3 text-endurix-orange" />
                        {t('eyebrow')}
                    </span>
                </motion.div>

                {/* Big 404 */}
                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: easeOut, delay: 0.1 }}
                    className="font-bold text-endurix-black dark:text-foreground uppercase leading-[0.85] tracking-tight"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    <span className="block text-[7rem] sm:text-[9rem] lg:text-[11rem] text-endurix-orange">
                        404
                    </span>
                </motion.h1>

                {/* Headline */}
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

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: easeOut, delay: 0.4 }}
                    className="text-endurix-black/60 dark:text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto"
                >
                    {t('subtitle')}
                </motion.p>

                {/* Ticker / progress bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="flex justify-center pt-2"
                >
                    <AnimatedTicker />
                </motion.div>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: easeOut, delay: 0.7 }}
                    className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
                >
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-8 py-4 transition-all hover:bg-endurix-orange/90 w-full sm:w-auto"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('primary')}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                        <BackButton href="/" label={t('secondary')} showLabel variant="outline" className="w-full sm:w-auto" />
                    </motion.div>
                </motion.div>

                {/* Tip */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.95 }}
                    className="text-[10px] text-endurix-black/40 dark:text-muted-foreground tracking-widest uppercase pt-6 border-t border-endurix-black/10 dark:border-border max-w-md mx-auto"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {t('tip')}
                </motion.p>
            </div>
        </div>
    );
}
