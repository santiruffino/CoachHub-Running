import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { comparisons } from './comparisons';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export const metadata: Metadata = {
    title: 'Comparativas',
    description:
        'Compará Endurix con planillas, WhatsApp y otras plataformas de coaching de resistencia. Automatización, carga, integraciones con Strava y Garmin, y asistente de IA.',
    alternates: { canonical: '/comparativas' },
    openGraph: {
        title: 'Comparativas | Endurix',
        description:
            'Compará Endurix con planillas, WhatsApp y otras plataformas de coaching de resistencia.',
        url: '/comparativas',
        type: 'website',
    },
};

export default function ComparativasIndexPage() {
    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <header className="border-b border-endurix-black/10 dark:border-border">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-endurix-black/70 dark:text-muted-foreground hover:text-endurix-orange transition-colors text-xs font-bold uppercase tracking-widest" style={FONT_MONO}>
                        <ArrowLeft className="w-4 h-4" />
                        Endurix
                    </Link>
                    <Link href="/#wishlist" className="inline-flex items-center gap-2 bg-endurix-orange text-white text-[11px] font-bold tracking-widest px-4 py-2.5 hover:bg-endurix-orange/90 transition-colors" style={FONT_DISPLAY}>
                        SUMATE A LA LISTA <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
                <span className="inline-block text-[10px] text-endurix-orange tracking-widest mb-4" style={FONT_MONO}>
                    COMPARATIVAS
                </span>
                <h1 className="font-bold text-endurix-black dark:text-foreground text-3xl sm:text-5xl leading-[1.05] tracking-tight uppercase max-w-2xl" style={FONT_DISPLAY}>
                    ENDURIX FRENTE A <span className="text-endurix-orange">TU FORMA ACTUAL DE ENTRENAR.</span>
                </h1>
                <p className="mt-6 text-endurix-black/65 dark:text-muted-foreground text-base leading-relaxed max-w-2xl">
                    Mirá cómo se compara Endurix con las herramientas que usás hoy: qué se automatiza, qué se integra y qué deja de sumar horas a tu semana.
                </p>

                <div className="mt-12 grid sm:grid-cols-2 gap-4">
                    {comparisons.map((c) => (
                        <Link
                            key={c.slug}
                            href={`/comparativas/${c.slug}`}
                            className="group flex flex-col justify-between border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-6 hover:border-endurix-orange/50 transition-colors min-h-[160px]"
                        >
                            <span className="text-[10px] tracking-widest text-endurix-black/40 dark:text-muted-foreground" style={FONT_MONO}>
                                ENDURIX VS.
                            </span>
                            <div className="mt-3">
                                <h2 className="font-bold text-endurix-black dark:text-foreground text-xl leading-tight group-hover:text-endurix-orange transition-colors" style={FONT_DISPLAY}>
                                    {c.title}
                                </h2>
                                <p className="mt-2 text-endurix-black/55 dark:text-muted-foreground text-sm leading-relaxed line-clamp-2">
                                    {c.description}
                                </p>
                            </div>
                            <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold tracking-widest text-endurix-orange" style={FONT_DISPLAY}>
                                VER COMPARATIVA <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
