'use client';

import Link from 'next/link';
import { ChevronsRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { comparisons } from '@/app/comparativas/comparisons';

// GEO / "answer engine optimization" play: deep-links that open an LLM with a
// prefilled question about Endurix. Providers without reliable query params
// (Gemini) just open the app.
const GEO_PROMPT = '¿Qué es Endurix? Es una plataforma de coaching para entrenadores y atletas de resistencia (running) con integración de IA vía MCP.';
const AI_LINKS = [
    { label: 'ChatGPT', href: `https://chatgpt.com/?q=${encodeURIComponent(GEO_PROMPT)}` },
    { label: 'Claude', href: `https://claude.ai/new?q=${encodeURIComponent(GEO_PROMPT)}` },
    { label: 'Perplexity', href: `https://www.perplexity.ai/search?q=${encodeURIComponent(GEO_PROMPT)}` },
    { label: 'Gemini', href: 'https://gemini.google.com/app' },
];

export function Footer() {
    const t = useTranslations('landing.footer');
    const currentYear = new Date().getFullYear();

    const productLinks = [
        { label: t('linkHowItWorks'), href: '/#how-it-works' },
        { label: t('linkAssistant'), href: '/#assistant' },
        { label: t('linkFaq'), href: '/#faq' },
        { label: t('linkPricing'), href: '/#wishlist' },
    ];

    const legalLinks = [
        { label: t('privacy'), href: '/privacy' },
        { label: t('terms'), href: '/terms' },
    ];

    return (
        <footer className="bg-endurix-dark dark:bg-background border-t border-white/8 dark:border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                {/* Top: brand + link columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-10">
                    {/* Brand */}
                    <div className="col-span-2 lg:col-span-2">
                        <Link href="/" className="flex items-center gap-1.5">
                            <ChevronsRight className="w-5 h-5 text-endurix-orange" strokeWidth={3} />
                            <span
                                className="font-bold text-endurix-orange tracking-widest text-sm uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                ENDURIX
                            </span>
                        </Link>
                        <p className="mt-4 text-white/40 text-sm leading-relaxed max-w-xs">
                            {t('tagline')}
                        </p>
                    </div>

                    {/* Product */}
                    <FooterColumn title={t('colProduct')} links={productLinks} />

                    {/* Compare */}
                    <FooterColumn
                        title={t('colCompare')}
                        links={comparisons.map((c) => ({
                            label: c.title.replace('Endurix vs. ', 'vs. '),
                            href: `/comparativas/${c.slug}`,
                        }))}
                    />

                    {/* Legal */}
                    <FooterColumn title={t('colLegal')} links={legalLinks} />
                </div>

                {/* GEO: ask an AI about Endurix */}
                <div className="mt-12 pt-8 border-t border-white/8 flex flex-col sm:flex-row sm:items-center gap-4">
                    <span
                        className="inline-flex items-center gap-2 text-[10px] text-white/50 tracking-widest"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-endurix-orange" />
                        {t('geoTitle')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {AI_LINKS.map((ai) => (
                            <a
                                key={ai.label}
                                href={ai.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold tracking-wide text-white/70 border border-white/15 hover:border-endurix-orange hover:text-white px-3 py-1.5 transition-colors"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {ai.label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Bottom: copyright */}
                <div className="mt-10 pt-6 border-t border-white/8">
                    <p
                        className="text-white/30 text-[10px] tracking-wider"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        {t('copyright', { year: currentYear })}
                    </p>
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({
    title,
    links,
}: {
    title: string;
    links: { label: string; href: string }[];
}) {
    return (
        <div>
            <span
                className="block text-[10px] text-white/35 tracking-widest mb-4"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {title}
            </span>
            <ul className="space-y-2.5">
                {links.map((link) => (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            className="text-white/55 hover:text-white transition-colors text-xs"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
