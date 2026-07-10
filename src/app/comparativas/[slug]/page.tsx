import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { getSiteUrl } from '@/lib/seo';
import { comparisons, getComparison, type CellValue } from '../comparisons';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export function generateStaticParams() {
    return comparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const comparison = getComparison(slug);
    if (!comparison) return {};

    const url = `/comparativas/${comparison.slug}`;
    return {
        title: comparison.title,
        description: comparison.description,
        alternates: { canonical: url },
        openGraph: {
            title: `${comparison.title} | Endurix`,
            description: comparison.description,
            url,
            type: 'article',
        },
    };
}

function Cell({ value, accent }: { value: CellValue; accent?: boolean }) {
    if (value === true) {
        return (
            <span
                className={`inline-flex items-center justify-center w-6 h-6 ${accent ? 'bg-endurix-orange' : 'bg-endurix-black/10 dark:bg-white/10'}`}
            >
                <Check className={accent ? 'w-4 h-4 text-white' : 'w-4 h-4 text-endurix-black/60 dark:text-white/70'} strokeWidth={3} />
            </span>
        );
    }
    if (value === false) {
        return (
            <span className="inline-flex items-center justify-center w-6 h-6">
                <X className="w-4 h-4 text-endurix-black/25 dark:text-white/25" strokeWidth={2.5} />
            </span>
        );
    }
    return (
        <span className={`text-sm leading-snug ${accent ? 'text-endurix-black dark:text-foreground font-medium' : 'text-endurix-black/55 dark:text-muted-foreground'}`}>
            {value}
        </span>
    );
}

export default async function ComparisonPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const comparison = getComparison(slug);
    if (!comparison) notFound();

    const siteUrl = getSiteUrl();
    const others = comparisons.filter((c) => c.slug !== comparison.slug);

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Comparativas', item: `${siteUrl}/comparativas` },
            { '@type': 'ListItem', position: 3, name: comparison.title, item: `${siteUrl}/comparativas/${comparison.slug}` },
        ],
    };

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

            {/* Header */}
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
                {/* Breadcrumb */}
                <nav className="text-[10px] tracking-widest text-endurix-black/40 dark:text-muted-foreground mb-8" style={FONT_MONO} aria-label="Breadcrumb">
                    <Link href="/" className="hover:text-endurix-orange">INICIO</Link>
                    <span className="mx-2">/</span>
                    <Link href="/comparativas" className="hover:text-endurix-orange">COMPARATIVAS</Link>
                </nav>

                {/* Title */}
                <span className="inline-block text-[10px] text-endurix-orange tracking-widest mb-4" style={FONT_MONO}>
                    COMPARATIVA
                </span>
                <h1 className="font-bold text-endurix-black dark:text-foreground text-3xl sm:text-5xl leading-[1.05] tracking-tight uppercase" style={FONT_DISPLAY}>
                    {comparison.title}
                </h1>
                <p className="mt-6 text-endurix-black/65 dark:text-muted-foreground text-base leading-relaxed max-w-2xl">
                    {comparison.intro}
                </p>

                {/* Comparison table */}
                <div className="mt-12 border border-endurix-black/12 dark:border-border bg-white dark:bg-card overflow-x-auto">
                    <table className="w-full min-w-[540px] border-collapse">
                        <thead>
                            <tr className="border-b border-endurix-black/12 dark:border-border">
                                <th className="text-left p-4 w-[36%]" />
                                <th className="text-left p-4 bg-endurix-orange/5 dark:bg-endurix-orange/10 border-x border-endurix-black/8 dark:border-border">
                                    <span className="text-xs font-bold tracking-widest text-endurix-orange" style={FONT_DISPLAY}>ENDURIX</span>
                                </th>
                                <th className="text-left p-4">
                                    <span className="text-[10px] font-bold tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FONT_MONO}>{comparison.themLabel}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparison.rows.map((row) => (
                                <tr key={row.feature} className="border-b border-endurix-black/8 dark:border-border/60 last:border-b-0">
                                    <td className="p-4 align-top">
                                        <span className="text-[11px] font-semibold tracking-wide uppercase text-endurix-black/70 dark:text-foreground/80" style={FONT_MONO}>
                                            {row.feature}
                                        </span>
                                    </td>
                                    <td className="p-4 align-top bg-endurix-orange/5 dark:bg-endurix-orange/10 border-x border-endurix-black/8 dark:border-border">
                                        <Cell value={row.endurix} accent />
                                    </td>
                                    <td className="p-4 align-top">
                                        <Cell value={row.them} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Verdict */}
                <div className="mt-10 border-l-2 border-endurix-orange bg-white dark:bg-card p-6">
                    <p className="text-endurix-black/80 dark:text-foreground/85 text-base leading-relaxed">
                        {comparison.verdict}
                    </p>
                    <Link href="/#wishlist" className="mt-5 inline-flex items-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-6 py-3 hover:bg-endurix-orange/90 transition-colors" style={FONT_DISPLAY}>
                        SUMATE AL ACCESO ANTICIPADO <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Disclaimer */}
                <p className="mt-8 text-[11px] text-endurix-black/40 dark:text-muted-foreground/70 leading-relaxed max-w-2xl">
                    Comparativa elaborada según información pública a la fecha. Las marcas mencionadas pertenecen a sus respectivos dueños y no implican afiliación ni respaldo.
                </p>

                {/* Other comparisons */}
                {others.length > 0 && (
                    <div className="mt-16">
                        <span className="block text-[10px] tracking-widest text-endurix-black/50 dark:text-muted-foreground mb-4" style={FONT_MONO}>
                            OTRAS COMPARATIVAS
                        </span>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {others.map((c) => (
                                <Link
                                    key={c.slug}
                                    href={`/comparativas/${c.slug}`}
                                    className="group flex items-center justify-between border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-5 hover:border-endurix-orange/50 transition-colors"
                                >
                                    <span className="font-bold text-endurix-black dark:text-foreground text-sm group-hover:text-endurix-orange transition-colors" style={FONT_DISPLAY}>
                                        {c.title}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-endurix-black/40 dark:text-muted-foreground group-hover:text-endurix-orange transition-colors shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
