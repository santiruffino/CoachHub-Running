'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
    BarChart3,
    CalendarRange,
    Cable,
    Sparkles,
    BellRing,
    Smartphone,
    Flag,
    type LucideIcon,
} from 'lucide-react';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

interface Tile {
    key: string;
    icon: LucideIcon;
    span: string;
    featured?: boolean;
}

const TILES: Tile[] = [
    { key: 'metrics', icon: BarChart3, span: 'lg:col-span-2 lg:row-span-2', featured: true },
    { key: 'assistant', icon: Sparkles, span: 'lg:col-span-2' },
    { key: 'planning', icon: CalendarRange, span: 'lg:col-span-1' },
    { key: 'sync', icon: Cable, span: 'lg:col-span-1' },
    { key: 'alerts', icon: BellRing, span: 'lg:col-span-1' },
    { key: 'app', icon: Smartphone, span: 'lg:col-span-1' },
    { key: 'races', icon: Flag, span: 'lg:col-span-2' },
];

// Compact per-tile illustrations so no card is left with an empty body. Kept as
// plain divs (no charts/images) to stay light and on-brand.
function TileVisual({ tileKey, t }: { tileKey: string; t: (key: string) => string }) {
    if (tileKey === 'metrics') {
        return (
            <div className="flex items-end gap-1.5 h-full w-full min-h-[72px]">
                {[45, 68, 52, 88, 74, 60, 82].map((h, i) => (
                    <div
                        key={i}
                        className={i === 3 ? 'flex-1 bg-endurix-orange' : 'flex-1 bg-endurix-black/15 dark:bg-white/15 group-hover:bg-endurix-black/25 dark:group-hover:bg-white/25 transition-colors'}
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>
        );
    }
    if (tileKey === 'planning') {
        // A multi-week plan (mesocycle) — each row is a week, filled squares are
        // session days. Conveys periodization: build once, assign whole weeks.
        const weeks = [
            [1, 0, 1, 1, 0, 1, 0],
            [1, 0, 1, 0, 1, 1, 0],
            [1, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 1],
        ];
        return (
            <div className="space-y-1 w-full">
                {weeks.map((week, w) => (
                    <div key={w} className="flex gap-1">
                        {week.map((d, i) => (
                            <div
                                key={i}
                                className={`flex-1 aspect-square ${d ? 'bg-endurix-orange' : 'bg-endurix-black/10 dark:bg-white/10'}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    }
    if (tileKey === 'sync') {
        return (
            <div className="space-y-1.5 w-full">
                {['STRAVA', 'GARMIN'].map((s) => (
                    <div key={s} className="flex items-center gap-2 border border-endurix-black/10 dark:border-border px-2 py-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="text-[9px] font-bold tracking-wider text-endurix-black/65 dark:text-foreground/75" style={FONT_MONO}>
                            {s}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    if (tileKey === 'assistant') {
        return (
            <div className="w-full border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-white/[0.03] px-3 py-2.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-endurix-orange shrink-0" />
                <span className="text-[11px] text-endurix-black/70 dark:text-foreground/80 truncate">
                    {t('vizAssistant')}
                </span>
                <span className="ml-auto w-1 h-4 bg-endurix-orange/70 shrink-0" />
            </div>
        );
    }
    if (tileKey === 'alerts') {
        return (
            <div className="w-full border-l-2 border-endurix-orange bg-endurix-orange/5 dark:bg-endurix-orange/10 px-3 py-2">
                <span className="text-[11px] text-endurix-black/70 dark:text-foreground/80 leading-snug">
                    {t('vizAlert')}
                </span>
            </div>
        );
    }
    if (tileKey === 'app') {
        return (
            <div className="w-full border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-white/[0.03] p-2.5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>{t('vizToday')}</span>
                    <span className="w-6 h-1.5 bg-endurix-orange/70" />
                </div>
                <div className="space-y-1">
                    <div className="h-1.5 w-full bg-endurix-black/10 dark:bg-white/10" />
                    <div className="h-1.5 w-2/3 bg-endurix-black/10 dark:bg-white/10" />
                </div>
            </div>
        );
    }
    // races — countdown
    return (
        <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-endurix-orange leading-none" style={FONT_DISPLAY}>
                D-14
            </span>
            <span className="text-[9px] tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>
                {t('vizNextRace')}
            </span>
        </div>
    );
}

export function BentoSection() {
    const t = useTranslations('landing.bento');

    return (
        <section id="product-features" className="py-24 lg:py-36 bg-white dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6 }}
                    className="mb-8 sm:mb-12 lg:mb-16 max-w-2xl"
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

                {/* Bento grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-row-dense auto-rows-[minmax(150px,1fr)]">
                    {TILES.map((tile, index) => {
                        const Icon = tile.icon;
                        return (
                            <motion.div
                                key={tile.key}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.45, delay: index * 0.06 }}
                                className={`${tile.span} group relative flex flex-col border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-5 sm:p-6 hover:border-endurix-orange/50 transition-colors duration-300 overflow-hidden`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-9 h-9 border border-endurix-black/15 dark:border-border flex items-center justify-center group-hover:border-endurix-orange group-hover:bg-endurix-orange/5 transition-all duration-300">
                                        <Icon
                                            className="w-4 h-4 text-endurix-black/50 dark:text-muted-foreground group-hover:text-endurix-orange transition-colors duration-300"
                                            strokeWidth={1.5}
                                        />
                                    </div>
                                    <span className="text-[9px] tracking-widest text-endurix-black/40 dark:text-muted-foreground font-semibold" style={FONT_MONO}>
                                        {t(`${tile.key}Label`)}
                                    </span>
                                </div>

                                {/* Illustration — fills the card body */}
                                <div className="flex-1 flex items-end py-5">
                                    <TileVisual tileKey={tile.key} t={t} />
                                </div>

                                <div>
                                    <h3
                                        className={`font-bold text-endurix-black dark:text-foreground leading-tight mb-1.5 ${tile.featured ? 'text-lg sm:text-xl' : 'text-base'}`}
                                        style={FONT_DISPLAY}
                                    >
                                        {t(`${tile.key}Title`)}
                                    </h3>
                                    <p className="text-endurix-black/55 dark:text-muted-foreground text-sm leading-relaxed">
                                        {t(`${tile.key}Desc`)}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
