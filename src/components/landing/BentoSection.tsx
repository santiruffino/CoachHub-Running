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
    Trophy,
    CircleCheckBig,
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
    { key: 'metrics', icon: BarChart3, span: 'lg:col-span-2', featured: true },
    { key: 'assistant', icon: Sparkles, span: 'lg:col-span-1' },
    { key: 'planning', icon: CalendarRange, span: 'lg:col-span-1' },
    { key: 'sync', icon: Cable, span: 'lg:col-span-1' },
    { key: 'alerts', icon: BellRing, span: 'lg:col-span-1' },
    { key: 'app', icon: Smartphone, span: 'lg:col-span-1' },
    { key: 'races', icon: Flag, span: 'lg:col-span-1' },
];

// Per-tile illustrations are compact, faithful mini-replicas of the platform's
// real screens (StatCard/GroupStatusCard, CriticalAlertItem, AthleteWeeklyCalendar
// CompactMonthCard, StravaStatusCard, AthleteRaceCard) so the Bento previews the
// actual product UI rather than abstract shapes. Sample data is illustrative.
function TileVisual({ tileKey, t }: { tileKey: string; t: (key: string) => string }) {
    // metrics — coach team-visibility dashboard: GroupStatusCard rows (name, %,
    // compliance bar). Green ≥80, orange ≥50, per getStatusConfig().
    if (tileKey === 'metrics') {
        const groups = [
            { name: 'GRUPO ÉLITE', rate: 87, ok: true },
            { name: 'GRUPO BASE', rate: 64, ok: false },
        ];
        return (
            <div className="grid grid-cols-2 gap-2 w-full">
                {groups.map((g) => (
                    <div key={g.name} className="border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-white/[0.03] p-2.5">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-[8px] font-semibold uppercase tracking-widest text-endurix-black/55 dark:text-muted-foreground truncate" style={FONT_MONO}>
                                {g.name}
                            </span>
                            <span
                                className={`text-base font-bold leading-none ${g.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-endurix-orange'}`}
                                style={FONT_DISPLAY}
                            >
                                {g.rate}%
                            </span>
                        </div>
                        <span className="mt-2 block text-[7px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground" style={FONT_MONO}>
                            {t('vizCompliance')}
                        </span>
                        <div className="mt-1 h-1 bg-endurix-black/15 dark:bg-border overflow-hidden">
                            <div
                                className={`h-full ${g.ok ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-endurix-orange'}`}
                                style={{ width: `${g.rate}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    // assistant — the AI assistant is external (via MCP); reflect the real "ask by
    // text" prompt rather than an in-app screen that doesn't exist.
    if (tileKey === 'assistant') {
        return (
            <div className="w-full border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-white/[0.03] px-3 py-2.5 flex items-center gap-2">
                <span className="text-[11px] font-bold text-endurix-orange shrink-0" style={FONT_MONO}>›</span>
                <span className="text-[11px] text-endurix-black/70 dark:text-foreground/80 truncate">
                    {t('vizAssistant')}
                </span>
                <span className="ml-auto w-1 h-4 bg-endurix-orange/70 shrink-0" />
            </div>
        );
    }
    // planning — AthleteWeeklyCalendar CompactMonthCard: a completed session
    // (orange left rule) above a planned one.
    if (tileKey === 'planning') {
        return (
            <div className="space-y-1.5 w-full">
                <div className="border border-endurix-orange/30 border-l-2 border-l-endurix-orange bg-white dark:bg-card px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[7px] font-bold uppercase tracking-widest text-endurix-orange" style={FONT_MONO}>
                            {t('vizDone')}
                        </span>
                        <CircleCheckBig className="h-2.5 w-2.5 text-endurix-orange shrink-0" />
                    </div>
                    <span className="block text-[10px] font-semibold uppercase leading-tight text-endurix-black dark:text-foreground" style={FONT_DISPLAY}>
                        Series 6×1000
                    </span>
                </div>
                <div className="border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-muted/50 px-2 py-1.5">
                    <span className="text-[7px] font-bold uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>
                        {t('vizPlanned')}
                    </span>
                    <span className="block text-[10px] font-semibold uppercase leading-tight text-endurix-black dark:text-foreground" style={FONT_DISPLAY}>
                        Fondo Z2 · 1h05
                    </span>
                </div>
            </div>
        );
    }
    // sync — StravaStatusCard: Strava + connected badge + last-sync meta.
    if (tileKey === 'sync') {
        return (
            <div className="w-full border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-endurix-black dark:text-foreground" style={FONT_DISPLAY}>
                        Strava
                    </span>
                    <span className="inline-flex items-center gap-1 text-[7px] font-bold tracking-wider uppercase border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-px" style={FONT_MONO}>
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        {t('vizConnected')}
                    </span>
                </div>
                <p className="mt-2 text-[8px] uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>
                    {t('vizLastSync')}
                </p>
            </div>
        );
    }
    // alerts — CriticalAlertItem: avatar + athlete + priority + message, orange rule.
    if (tileKey === 'alerts') {
        return (
            <div className="w-full flex items-center gap-2.5 border border-endurix-black/10 dark:border-border border-l-2 border-l-endurix-orange bg-endurix-paper/60 dark:bg-card px-2.5 py-2">
                <span className="h-7 w-7 shrink-0 flex items-center justify-center text-[9px] font-bold uppercase bg-endurix-black/8 dark:bg-white/8 text-endurix-black dark:text-foreground" style={FONT_MONO}>
                    MR
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide leading-tight text-endurix-black dark:text-foreground truncate" style={FONT_DISPLAY}>
                        Martina R.
                    </p>
                    <p className="text-[7px] font-bold uppercase tracking-widest text-endurix-orange" style={FONT_MONO}>
                        {t('vizAlert')}
                    </p>
                </div>
                <span className="text-[7px] font-bold uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground shrink-0" style={FONT_MONO}>
                    P1 · 87
                </span>
            </div>
        );
    }
    // app — athlete's "today" from the weekly calendar: day header + planned session.
    if (tileKey === 'app') {
        return (
            <div className="w-full border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-white/[0.03] p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-baseline gap-1.5">
                        <span className="text-[7px] font-bold uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>MIÉ</span>
                        <span className="text-sm font-bold text-endurix-orange leading-none" style={FONT_DISPLAY}>15</span>
                    </span>
                    <span className="text-[7px] font-bold uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>{t('vizToday')}</span>
                </div>
                <div className="border-l-2 border-l-endurix-orange bg-endurix-orange/5 dark:bg-endurix-orange/10 px-2 py-1">
                    <span className="text-[10px] font-semibold uppercase leading-tight text-endurix-black dark:text-foreground" style={FONT_DISPLAY}>
                        Fondo largo · Z2
                    </span>
                </div>
            </div>
        );
    }
    // races — AthleteRaceCard: trophy + race + countdown badge (T - N days).
    return (
        <div className="w-full flex items-center gap-2 border border-endurix-black/10 dark:border-border bg-endurix-paper/60 dark:bg-card px-2.5 py-2">
            <span className="p-1.5 bg-endurix-orange/10 text-endurix-orange shrink-0">
                <Trophy className="h-3 w-3" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase leading-tight text-endurix-black dark:text-foreground truncate" style={FONT_DISPLAY}>
                    Maratón BA
                </p>
                <p className="text-[7px] font-bold uppercase tracking-widest text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>
                    {t('vizNextRace')}
                </p>
            </div>
            <span className="text-[7px] font-bold uppercase tracking-widest border border-endurix-orange/30 bg-endurix-orange/10 text-endurix-orange px-1.5 py-px shrink-0" style={FONT_MONO}>
                {t('vizCountdown')}
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

                {/* Bento grid — even row heights on lg (auto-rows-fr) keep every
                    tile the same height so no card is left with a large empty band. */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-row-dense auto-rows-auto lg:auto-rows-fr">
                    {TILES.map((tile, index) => {
                        const Icon = tile.icon;
                        return (
                            <motion.div
                                key={tile.key}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.45, delay: index * 0.06 }}
                                className={`${tile.span} group relative flex flex-col border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4 sm:p-5 hover:border-endurix-orange/50 transition-colors duration-300 overflow-hidden`}
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
                                <div className="flex-1 flex items-end py-3">
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
