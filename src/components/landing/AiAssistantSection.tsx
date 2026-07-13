'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, ArrowRight, Terminal } from 'lucide-react';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export function AiAssistantSection() {
    const t = useTranslations('landing.aiAssistant');
    const chips = [t('chip1'), t('chip2'), t('chip3'), t('chip4'), t('chip5')];

    return (
        <section id="assistant" className="bg-endurix-dark dark:bg-background overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Copy */}
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.65 }}
                    >
                        <span
                            className="inline-flex items-center gap-2 text-[10px] text-endurix-orange tracking-widest mb-5"
                            style={FONT_MONO}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {t('eyebrow')}
                        </span>
                        <h2
                            className="font-bold text-white text-2xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight uppercase"
                            style={FONT_DISPLAY}
                        >
                            {t('title1')}{' '}
                            <span className="text-endurix-orange">{t('titleHighlight')}</span>
                        </h2>
                        <p className="mt-6 text-white/55 text-base leading-relaxed max-w-md">
                            {t('subtitle')}
                        </p>

                        {/* Command chips */}
                        <div className="mt-8 flex flex-wrap gap-2.5">
                            {chips.map((chip) => (
                                <span
                                    key={chip}
                                    className="text-[11px] font-semibold tracking-wide text-white/80 border border-white/15 bg-white/[0.03] px-3 py-1.5"
                                    style={FONT_MONO}
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>

                        <Link
                            href="#wishlist"
                            className="mt-9 inline-flex items-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-7 py-3.5 transition-all hover:bg-endurix-orange/90"
                            style={FONT_DISPLAY}
                        >
                            {t('cta')} <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>

                    {/* Chat / terminal mock */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.75, delay: 0.15 }}
                        className="relative"
                    >
                        <div className="absolute -bottom-3 -right-3 w-full h-full bg-endurix-orange/20" aria-hidden />
                        <div className="relative bg-[#0D0F12] border border-white/12">
                            {/* Terminal header */}
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
                                <Terminal className="w-3.5 h-3.5 text-endurix-orange" />
                                <span className="text-[9px] tracking-widest text-white/40" style={FONT_MONO}>
                                    {t('convHeader')}
                                </span>
                            </div>

                            {/* Body */}
                            <div className="p-5 space-y-4">
                                {/* Prompt label */}
                                <span className="block text-[8px] tracking-widest text-white/30" style={FONT_MONO}>
                                    {t('promptLabel')}
                                </span>

                                {/* User prompt */}
                                <div className="flex justify-end">
                                    <p className="max-w-[85%] bg-endurix-orange/90 text-white text-[13px] leading-snug px-3.5 py-2.5">
                                        {t('promptExample')}
                                    </p>
                                </div>

                                {/* Assistant response */}
                                <div className="flex justify-start">
                                    <div className="max-w-[90%] border border-white/12 bg-white/[0.03] px-3.5 py-3 space-y-2.5">
                                        <p className="text-[13px] text-white/85 leading-snug">
                                            {t('convReply')}
                                        </p>
                                        {[t('convLine1'), t('convLine2'), t('convLine3')].map((line) => (
                                            <div key={line} className="flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-endurix-orange shrink-0" />
                                                <span className="text-[11px] text-white/60" style={FONT_MONO}>
                                                    {line}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-[8px] font-bold tracking-wider border border-green-500/30 text-green-500 px-1.5 py-px" style={FONT_MONO}>
                                                {t('convAssigned')}
                                            </span>
                                            <span className="text-[9px] text-white/30" style={FONT_MONO}>
                                                {t('convBadge')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
