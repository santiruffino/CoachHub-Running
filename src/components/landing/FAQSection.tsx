'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import Link from 'next/link';

// Keys q1/a1 … q7/a7 defined in messages/es.json under landing.faq.
const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function FAQSection() {
    const t = useTranslations('landing.faq');
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 lg:py-36 bg-endurix-paper dark:bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6 }}
                    className="mb-10 sm:mb-14"
                >
                    <span
                        className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        {t('eyebrow')}
                    </span>
                    <h2
                        className="font-bold text-endurix-black dark:text-foreground text-2xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-tight uppercase"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        {t('title1')}{' '}
                        <span className="text-endurix-orange">{t('titleHighlight')}</span>
                    </h2>
                </motion.div>

                {/* Accordion */}
                <div className="border-t border-endurix-black/12 dark:border-border">
                    {FAQ_KEYS.map((n, index) => {
                        const isOpen = open === index;
                        return (
                            <motion.div
                                key={n}
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.4, delay: index * 0.04 }}
                                className="border-b border-endurix-black/12 dark:border-border"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpen(isOpen ? null : index)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                                >
                                    <span
                                        className="font-bold text-endurix-black dark:text-foreground text-base sm:text-lg leading-snug group-hover:text-endurix-orange transition-colors"
                                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                    >
                                        {t(`q${n}`)}
                                    </span>
                                    <span
                                        className={`shrink-0 w-8 h-8 border flex items-center justify-center transition-all duration-300 ${
                                            isOpen
                                                ? 'bg-endurix-orange border-endurix-orange'
                                                : 'border-endurix-black/20 dark:border-white/20 group-hover:border-endurix-orange'
                                        }`}
                                    >
                                        <Plus
                                            className={`w-4 h-4 transition-all duration-300 ${
                                                isOpen
                                                    ? 'text-white rotate-45'
                                                    : 'text-endurix-black/60 dark:text-muted-foreground group-hover:text-endurix-orange'
                                            }`}
                                            strokeWidth={2}
                                        />
                                    </span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                            className="overflow-hidden"
                                        >
                                            <p className="pb-6 pr-12 text-endurix-black/65 dark:text-muted-foreground text-sm sm:text-base leading-relaxed">
                                                {t(`a${n}`)}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Contact CTA */}
                <p className="mt-10 text-sm text-endurix-black/60 dark:text-muted-foreground">
                    {t('ctaText')}{' '}
                    <Link
                        href="#wishlist"
                        className="text-endurix-orange font-semibold hover:underline underline-offset-4"
                    >
                        {t('ctaLink')}
                    </Link>
                </p>
            </div>
        </section>
    );
}
