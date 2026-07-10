import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = {
    title: 'Términos y condiciones',
    description:
        'Términos y condiciones de uso de Endurix, la plataforma de coaching para deportes de resistencia.',
    alternates: { canonical: '/terms' },
    openGraph: {
        title: 'Términos y condiciones | Endurix',
        description:
            'Términos y condiciones de uso de la plataforma de coaching Endurix.',
        url: '/terms',
        type: 'article',
    },
};

export default async function TermsPage() {
    const t = await getTranslations('legal.terms');

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <header className="border-b border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-background">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-endurix-black/70 dark:text-muted-foreground hover:text-endurix-orange transition-colors text-xs font-bold uppercase tracking-widest"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        {t('backToHome')}
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-24">
                <div className="mb-12 pb-8 border-b border-endurix-black/10 dark:border-border">
                    <span
                        className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        LEGAL · {t('lastUpdated').toUpperCase()}
                    </span>
                    <h1
                        className="font-bold text-endurix-black dark:text-foreground text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[1.05] tracking-tight uppercase"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        {t('title')}
                    </h1>
                </div>

                <article className="space-y-12">
                    {/* Acceptance */}
                    <Section title={t('sections.acceptance.title')}>
                        <P>{t('sections.acceptance.p1')}</P>
                        <P>{t('sections.acceptance.p2')}</P>
                    </Section>

                    {/* Description */}
                    <Section title={t('sections.description.title')}>
                        <P>{t('sections.description.p1')}</P>
                        <Sub title={t('sections.description.features.title')}>
                            <List items={[
                                t('sections.description.features.items.plans'),
                                t('sections.description.features.items.sync'),
                                t('sections.description.features.items.analytics'),
                                t('sections.description.features.items.groups'),
                                t('sections.description.features.items.notifications'),
                                t('sections.description.features.items.ai'),
                                t('sections.description.features.items.mcp'),
                            ]} />
                        </Sub>
                    </Section>

                    {/* Accounts */}
                    <Section title={t('sections.accounts.title')}>
                        <Sub title={t('sections.accounts.registration.title')}>
                            <P>{t('sections.accounts.registration.text')}</P>
                        </Sub>
                        <Sub title={t('sections.accounts.roles.title')}>
                            <P>{t('sections.accounts.roles.text')}</P>
                            <List items={[
                                t('sections.accounts.roles.items.coach'),
                                t('sections.accounts.roles.items.athlete'),
                                t('sections.accounts.roles.items.admin'),
                            ]} />
                        </Sub>
                        <Sub title={t('sections.accounts.accuracy.title')}>
                            <P>{t('sections.accounts.accuracy.text')}</P>
                        </Sub>
                    </Section>

                    {/* Integrations */}
                    <Section title={t('sections.integrations.title')}>
                        <P>{t('sections.integrations.p1')}</P>
                        <Sub title={t('sections.integrations.strava.title')}>
                            <List items={[
                                t('sections.integrations.strava.items.auth'),
                                t('sections.integrations.strava.items.data'),
                                t('sections.integrations.strava.items.usage'),
                                t('sections.integrations.strava.items.revoke'),
                                t('sections.integrations.strava.items.compliance'),
                                t('sections.integrations.strava.items.noSell'),
                            ]} />
                        </Sub>
                        <Sub title={t('sections.integrations.garmin.title')}>
                            <List items={[
                                t('sections.integrations.garmin.items.auth'),
                                t('sections.integrations.garmin.items.data'),
                                t('sections.integrations.garmin.items.priority'),
                                t('sections.integrations.garmin.items.revoke'),
                                t('sections.integrations.garmin.items.compliance'),
                            ]} />
                        </Sub>
                        <P>{t('sections.integrations.disclaimer')}</P>
                    </Section>

                    {/* AI */}
                    <Section title={t('sections.ai.title')}>
                        <P>{t('sections.ai.p1')}</P>
                        <Sub title={t('sections.ai.usage.title')}>
                            <List items={[
                                t('sections.ai.usage.items.analysis'),
                                t('sections.ai.usage.items.advisory'),
                                t('sections.ai.usage.items.accuracy'),
                                t('sections.ai.usage.items.review'),
                            ]} />
                        </Sub>
                        <Sub title={t('sections.ai.mcp.title')}>
                            <P>{t('sections.ai.mcp.text')}</P>
                            <List items={[
                                t('sections.ai.mcp.items.access'),
                                t('sections.ai.mcp.items.responsibility'),
                                t('sections.ai.mcp.items.noExpansion'),
                                t('sections.ai.mcp.items.logging'),
                            ]} />
                        </Sub>
                        <Sub title={t('sections.ai.providers.title')}>
                            <P>{t('sections.ai.providers.text')}</P>
                        </Sub>
                    </Section>

                    {/* Acceptable Use */}
                    <Section title={t('sections.acceptableUse.title')}>
                        <P>{t('sections.acceptableUse.p1')}</P>
                        <Sub title={t('sections.acceptableUse.do.title')}>
                            <List items={[
                                t('sections.acceptableUse.do.items.lawful'),
                                t('sections.acceptableUse.do.items.accurate'),
                                t('sections.acceptableUse.do.items.respectPrivacy'),
                                t('sections.acceptableUse.do.items.coachEthics'),
                            ]} />
                        </Sub>
                        <Sub title={t('sections.acceptableUse.dont.title')}>
                            <List items={[
                                t('sections.acceptableUse.dont.items.unauthorized'),
                                t('sections.acceptableUse.dont.items.scraping'),
                                t('sections.acceptableUse.dont.items.interference'),
                                t('sections.acceptableUse.dont.items.misrepresent'),
                                t('sections.acceptableUse.dont.items.resell'),
                                t('sections.acceptableUse.dont.items.abuseMcp'),
                                t('sections.acceptableUse.dont.items.abuseAi'),
                            ]} />
                        </Sub>
                    </Section>

                    {/* IP */}
                    <Section title={t('sections.ip.title')}>
                        <Sub title={t('sections.ip.platform.title')}>
                            <P>{t('sections.ip.platform.text')}</P>
                        </Sub>
                        <Sub title={t('sections.ip.userData.title')}>
                            <P>{t('sections.ip.userData.text')}</P>
                        </Sub>
                        <Sub title={t('sections.ip.thirdParty.title')}>
                            <P>{t('sections.ip.thirdParty.text')}</P>
                        </Sub>
                    </Section>

                    {/* Privacy */}
                    <Section title={t('sections.privacy.title')}>
                        <P>{t('sections.privacy.text')}</P>
                        <Callout>{t('sections.privacy.coachResponsibility')}</Callout>
                    </Section>

                    {/* Warranties */}
                    <Section title={t('sections.warranties.title')}>
                        <P>{t('sections.warranties.p1')}</P>
                        <List items={[
                            t('sections.warranties.items.fitness'),
                            t('sections.warranties.items.accuracy'),
                            t('sections.warranties.items.availability'),
                            t('sections.warranties.items.aiAccuracy'),
                            t('sections.warranties.items.integrations'),
                        ]} />
                    </Section>

                    {/* Liability */}
                    <Section title={t('sections.liability.title')}>
                        <P>{t('sections.liability.p1')}</P>
                        <List items={[
                            t('sections.liability.items.indirect'),
                            t('sections.liability.items.lostData'),
                            t('sections.liability.items.thirdParty'),
                            t('sections.liability.items.health'),
                            t('sections.liability.items.unauthorized'),
                        ]} />
                        <P>{t('sections.liability.p2')}</P>
                    </Section>

                    {/* Indemnification */}
                    <Section title={t('sections.indemnification.title')}>
                        <P>{t('sections.indemnification.text')}</P>
                    </Section>

                    {/* Termination */}
                    <Section title={t('sections.termination.title')}>
                        <Sub title={t('sections.termination.byUser.title')}>
                            <P>{t('sections.termination.byUser.text')}</P>
                        </Sub>
                        <Sub title={t('sections.termination.byUs.title')}>
                            <P>{t('sections.termination.byUs.text')}</P>
                        </Sub>
                        <Sub title={t('sections.termination.effects.title')}>
                            <P>{t('sections.termination.effects.text')}</P>
                        </Sub>
                    </Section>

                    {/* Governing Law */}
                    <Section title={t('sections.law.title')}>
                        <P>{t('sections.law.text')}</P>
                    </Section>

                    {/* Changes */}
                    <Section title={t('sections.changes.title')}>
                        <P>{t('sections.changes.text')}</P>
                    </Section>

                    {/* Severability */}
                    <Section title={t('sections.severability.title')}>
                        <P>{t('sections.severability.text')}</P>
                    </Section>

                    {/* Contact */}
                    <Section title={t('sections.contact.title')}>
                        <P>{t('sections.contact.subtitle')}</P>
                        <Callout>
                            <strong className="font-bold text-endurix-black dark:text-foreground">{t('sections.contact.general')}:</strong>{' '}
                            <a href="mailto:info@endurix.app" className="text-endurix-orange hover:underline">info@endurix.app</a>
                            <br />
                            <strong className="font-bold text-endurix-black dark:text-foreground">{t('sections.contact.privacy')}:</strong>{' '}
                            <a href="mailto:privacy@endurix.app" className="text-endurix-orange hover:underline">privacy@endurix.app</a>
                        </Callout>
                    </Section>
                </article>
            </main>

            <footer className="border-t border-endurix-black/10 dark:border-border mt-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <p
                        className="text-center text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        {t('footer')}
                    </p>
                </div>
            </footer>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="border-l-2 border-endurix-orange pl-3 sm:pl-6 space-y-4">
            <h2
                className="text-2xl lg:text-3xl font-bold uppercase tracking-tight text-endurix-black dark:text-foreground"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
                {title}
            </h2>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function Sub({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="mt-6 space-y-3">
            <h3
                className="text-base font-bold uppercase tracking-widest text-endurix-black dark:text-foreground"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
                {title}
            </h3>
            {subtitle && (
                <p
                    className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {subtitle}
                </p>
            )}
            {children}
        </div>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-sm lg:text-base text-endurix-black/80 dark:text-foreground/80 leading-relaxed">
            {children}
        </p>
    );
}

function List({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2 pl-0 list-none">
            {items.map((item, i) => (
                <li
                    key={i}
                    className="relative pl-5 text-sm lg:text-base text-endurix-black/80 dark:text-foreground/80 leading-relaxed"
                >
                    <span className="absolute left-0 top-2.5 w-2 h-px bg-endurix-orange" aria-hidden />
                    {item}
                </li>
            ))}
        </ul>
    );
}

function Callout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-endurix-black dark:bg-muted p-5 border-l-4 border-endurix-orange">
            <p className="text-sm text-white/90 leading-relaxed">
                {children}
            </p>
        </div>
    );
}
