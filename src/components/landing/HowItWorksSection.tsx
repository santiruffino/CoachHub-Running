'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { UserPlus, Watch, ClipboardList, Activity } from 'lucide-react';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

// Small stylized UI mock rendered on the right of each step. Kept as plain divs
// (no charts) so it stays light and on-brand with the terminal aesthetic.
function StepMock({ n }: { n: number }) {
    if (n === 1) {
        return (
            <div className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[8px] tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FONT_MONO}>
                        INVITAR ATLETA
                    </span>
                    <span className="text-[7px] font-bold tracking-wider border border-green-500/30 text-green-600 dark:text-green-500 px-1.5 py-px" style={FONT_MONO}>
                        AGREGADO
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-endurix-orange/15 text-endurix-orange flex items-center justify-center text-[10px] font-bold" style={FONT_DISPLAY}>
                        MR
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-endurix-black dark:text-foreground leading-tight" style={FONT_DISPLAY}>
                            Martina Ruiz
                        </p>
                        <p className="text-[9px] text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>
                            endurix.app/u/martina
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    if (n === 2) {
        return (
            <div className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                <span className="block text-[8px] tracking-widest text-endurix-black/50 dark:text-muted-foreground mb-3" style={FONT_MONO}>
                    FUENTES SINCRONIZADAS
                </span>
                <div className="grid grid-cols-2 gap-2">
                    {['STRAVA', 'GARMIN'].map((s) => (
                        <div key={s} className="flex items-center gap-2 border border-endurix-black/10 dark:border-border px-2 py-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[9px] font-bold tracking-wider text-endurix-black/70 dark:text-foreground/80" style={FONT_MONO}>
                                {s}
                            </span>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-[9px] text-endurix-black/45 dark:text-muted-foreground" style={FONT_MONO}>
                    Última actividad · hace 2 min
                </p>
            </div>
        );
    }
    if (n === 3) {
        return (
            <div className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[8px] tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FONT_MONO}>
                        PLAN LISTO
                    </span>
                    <span className="text-[8px] tracking-wider text-endurix-orange font-bold" style={FONT_MONO}>
                        6 SEM · 5 D
                    </span>
                </div>
                {[
                    { n: '01', t: 'Base aeróbica — rodaje Z2' },
                    { n: '02', t: 'Series — 6×1000 @ umbral' },
                ].map((row) => (
                    <div key={row.n} className="flex items-center gap-3 py-1.5 border-t border-endurix-black/8 dark:border-border/60 first:border-t-0">
                        <span className="text-[9px] text-endurix-black/35 dark:text-muted-foreground" style={FONT_MONO}>
                            {row.n}
                        </span>
                        <span className="text-[11px] text-endurix-black/75 dark:text-foreground/80">
                            {row.t}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
            <span className="block text-[8px] tracking-widest text-endurix-black/50 dark:text-muted-foreground mb-3" style={FONT_MONO}>
                CARGA / ALERTAS
            </span>
            <div className="flex items-end gap-1.5 h-14">
                {[40, 62, 48, 90, 70, 55].map((h, i) => (
                    <div
                        key={i}
                        className={i === 3 ? 'flex-1 bg-endurix-orange' : 'flex-1 bg-endurix-black/70 dark:bg-white/70'}
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>
            <div className="mt-3 flex items-center gap-2 border-l-2 border-endurix-orange bg-endurix-orange/5 dark:bg-endurix-orange/10 px-2 py-1.5">
                <span className="text-[9px] text-endurix-black/70 dark:text-foreground/80">
                    Carga alta esta semana · revisar a 2 atletas
                </span>
            </div>
        </div>
    );
}

export function HowItWorksSection() {
    const t = useTranslations('landing.howItWorks');

    const steps = [1, 2, 3, 4].map((n) => ({
        n,
        tag: t(`step${n}Tag`),
        title: t(`step${n}Title`),
        desc: t(`step${n}Desc`),
    }));
    const icons = [UserPlus, Watch, ClipboardList, Activity];

    return (
        <section id="how-it-works" className="py-24 lg:py-36 bg-endurix-paper dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6 }}
                    className="mb-12 sm:mb-16 max-w-2xl"
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

                {/* Steps */}
                <div className="space-y-4">
                    {steps.map((step, index) => {
                        const Icon = icons[index];
                        return (
                            <motion.div
                                key={step.n}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.5, delay: index * 0.08 }}
                                className="grid md:grid-cols-2 gap-4 md:gap-10 items-center border border-endurix-black/12 dark:border-border bg-endurix-paper dark:bg-card p-5 sm:p-8"
                            >
                                {/* Copy */}
                                <div className="flex gap-4 sm:gap-6">
                                    <span
                                        className="text-4xl sm:text-5xl font-bold text-endurix-orange/25 dark:text-endurix-orange/30 leading-none shrink-0"
                                        style={FONT_DISPLAY}
                                    >
                                        {String(step.n).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon className="w-4 h-4 text-endurix-orange" strokeWidth={1.75} />
                                            <span className="text-[9px] tracking-widest text-endurix-black/50 dark:text-muted-foreground font-semibold" style={FONT_MONO}>
                                                {step.tag}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-endurix-black dark:text-foreground text-lg sm:text-xl leading-tight mb-2" style={FONT_DISPLAY}>
                                            {step.title}
                                        </h3>
                                        <p className="text-endurix-black/60 dark:text-muted-foreground text-sm leading-relaxed max-w-md">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>

                                {/* Mock */}
                                <div className="md:pl-6">
                                    <StepMock n={step.n} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
