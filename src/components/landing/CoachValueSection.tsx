'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Cable, Users, type LucideIcon } from 'lucide-react';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

// Consolidated value section — merges the strongest, non-feature-list angles of
// the former Features + CoachOps sections into one compact band: outcomes and
// workflow, distinct from the Bento feature grid.
const PILLARS: Array<{ key: string; icon: LucideIcon }> = [
    { key: 'decide', icon: ShieldCheck },
    { key: 'automate', icon: Cable },
    { key: 'flow', icon: Users },
];

export function CoachValueSection() {
    const t = useTranslations('landing.value');

    return (
        <section id="coach-value" className="py-24 lg:py-32 bg-endurix-paper dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6 }}
                    className="mb-10 sm:mb-14 max-w-2xl"
                >
                    <span className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4" style={FONT_MONO}>
                        {t('eyebrow')}
                    </span>
                    <h2
                        className="font-bold text-endurix-black dark:text-foreground text-2xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight uppercase"
                        style={FONT_DISPLAY}
                    >
                        {t('title1')}{' '}
                        <span className="text-endurix-orange">{t('titleHighlight')}</span>
                    </h2>
                    <p className="mt-6 text-endurix-black/60 dark:text-muted-foreground text-base leading-relaxed">
                        {t('subtitle')}
                    </p>
                </motion.div>

                {/* Pillars — light layout (top rule + icon + copy), no heavy card
                    chrome, to keep the page short and visually distinct from Bento. */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                    {PILLARS.map((pillar, index) => {
                        const Icon = pillar.icon;
                        return (
                            <motion.div
                                key={pillar.key}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="border-t-2 border-endurix-black/15 dark:border-border pt-5"
                            >
                                <div className="flex items-center gap-2.5 mb-3">
                                    <Icon className="w-4 h-4 text-endurix-orange" strokeWidth={1.75} />
                                    <span className="text-[9px] tracking-widest text-endurix-black/50 dark:text-muted-foreground font-semibold" style={FONT_MONO}>
                                        {t(`${pillar.key}Tag`)}
                                    </span>
                                </div>
                                <h3
                                    className="font-bold text-endurix-black dark:text-foreground text-lg sm:text-xl leading-tight mb-2"
                                    style={FONT_DISPLAY}
                                >
                                    {t(`${pillar.key}Title`)}
                                </h3>
                                <p className="text-endurix-black/60 dark:text-muted-foreground text-sm leading-relaxed">
                                    {t(`${pillar.key}Desc`)}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
