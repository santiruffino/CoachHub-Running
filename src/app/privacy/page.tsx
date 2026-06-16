import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
    const t = await getTranslations('legal.privacy');

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            {/* Header */}
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

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                {/* Title block */}
                <div className="mb-12 pb-8 border-b border-endurix-black/10 dark:border-border">
                    <span
                        className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        LEGAL · {t('lastUpdated').toUpperCase()}
                    </span>
                    <h1
                        className="font-bold text-endurix-black dark:text-foreground text-4xl lg:text-5xl leading-[1.05] tracking-tight uppercase"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        {t('title')}
                    </h1>
                </div>

                <article className="space-y-12">
                    {/* Introduction */}
                    <PrivacySection title={t('sections.introduction.title')}>
                        <PrivacyParagraph>{t('sections.introduction.p1')}</PrivacyParagraph>
                        <PrivacyParagraph>{t('sections.introduction.p2')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* Information We Collect */}
                    <PrivacySection title={t('sections.collect.title')}>
                        <PrivacySubSection title={t('sections.collect.personal.title')} subtitle={t('sections.collect.personal.subtitle')}>
                            <PrivacyList
                                items={[
                                    t('sections.collect.personal.items.account'),
                                    t('sections.collect.personal.items.profile'),
                                    t('sections.collect.personal.items.integrations'),
                                    t('sections.collect.personal.items.support'),
                                ]}
                            />
                        </PrivacySubSection>

                        <PrivacySubSection title={t('sections.collect.activity.title')} subtitle={t('sections.collect.activity.subtitle')}>
                            <PrivacyList
                                items={[
                                    t('sections.collect.activity.items.workout'),
                                    t('sections.collect.activity.items.gps'),
                                    t('sections.collect.activity.items.history'),
                                    t('sections.collect.activity.items.device'),
                                ]}
                            />
                        </PrivacySubSection>

                        <PrivacySubSection title={t('sections.collect.usage.title')} subtitle={t('sections.collect.usage.subtitle')}>
                            <PrivacyList
                                items={[
                                    t('sections.collect.usage.items.logData'),
                                    t('sections.collect.usage.items.deviceInfo'),
                                    t('sections.collect.usage.items.cookies'),
                                ]}
                            />
                        </PrivacySubSection>
                    </PrivacySection>

                    {/* How We Use Your Information */}
                    <PrivacySection title={t('sections.usage.title')}>
                        <PrivacyParagraph>{t('sections.usage.subtitle')}</PrivacyParagraph>
                        <PrivacyList
                            items={[
                                `${t('sections.usage.items.services.label')}: ${t('sections.usage.items.services.text')}`,
                                `${t('sections.usage.items.personalization.label')}: ${t('sections.usage.items.personalization.text')}`,
                                `${t('sections.usage.items.analytics.label')}: ${t('sections.usage.items.analytics.text')}`,
                                `${t('sections.usage.items.communication.label')}: ${t('sections.usage.items.communication.text')}`,
                                `${t('sections.usage.items.improvement.label')}: ${t('sections.usage.items.improvement.text')}`,
                                `${t('sections.usage.items.security.label')}: ${t('sections.usage.items.security.text')}`,
                                `${t('sections.usage.items.compliance.label')}: ${t('sections.usage.items.compliance.text')}`,
                            ]}
                        />
                    </PrivacySection>

                    {/* Third-Party Integrations */}
                    <PrivacySection title={t('sections.integrations.title')}>
                        <PrivacyParagraph>{t('sections.integrations.p1')}</PrivacyParagraph>
                        <PrivacyList
                            items={[
                                t('sections.integrations.items.auth'),
                                t('sections.integrations.items.policies'),
                                t('sections.integrations.items.disconnect'),
                            ]}
                        />
                        <PrivacyParagraph>{t('sections.integrations.p2')}</PrivacyParagraph>

                        <PrivacySubSection title={t('sections.integrations.strava.title')}>
                            <PrivacyParagraph>{t('sections.integrations.strava.intro')}</PrivacyParagraph>
                            <PrivacyList
                                items={[
                                    t('sections.integrations.strava.items.consent'),
                                    t('sections.integrations.strava.items.scope'),
                                    t('sections.integrations.strava.items.withdrawal'),
                                    t('sections.integrations.strava.items.deletion'),
                                    t('sections.integrations.strava.items.usageData'),
                                    t('sections.integrations.strava.items.attribution'),
                                ]}
                            />
                        </PrivacySubSection>
                    </PrivacySection>

                    {/* Data Sharing */}
                    <PrivacySection title={t('sections.sharing.title')}>
                        <PrivacyParagraph>{t('sections.sharing.subtitle')}</PrivacyParagraph>
                        <PrivacySubSection title={t('sections.sharing.coach.title')}>
                            <PrivacyParagraph>{t('sections.sharing.coach.text')}</PrivacyParagraph>
                        </PrivacySubSection>
                        <PrivacySubSection title={t('sections.sharing.providers.title')}>
                            <PrivacyParagraph>{t('sections.sharing.providers.text')}</PrivacyParagraph>
                        </PrivacySubSection>
                        <PrivacySubSection title={t('sections.sharing.legal.title')}>
                            <PrivacyParagraph>{t('sections.sharing.legal.text')}</PrivacyParagraph>
                        </PrivacySubSection>
                        <PrivacyCallout>{t('sections.sharing.noSell')}</PrivacyCallout>
                    </PrivacySection>

                    {/* Data Security */}
                    <PrivacySection title={t('sections.security.title')}>
                        <PrivacyParagraph>{t('sections.security.p1')}</PrivacyParagraph>
                        <PrivacyList
                            items={[
                                t('sections.security.items.encryption'),
                                t('sections.security.items.assessments'),
                                t('sections.security.items.accessControls'),
                                t('sections.security.items.infrastructure'),
                            ]}
                        />
                        <PrivacyParagraph>{t('sections.security.p2')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* Your Rights */}
                    <PrivacySection title={t('sections.rights.title')}>
                        <PrivacyParagraph>{t('sections.rights.subtitle')}</PrivacyParagraph>
                        <PrivacyList
                            items={[
                                `${t('sections.rights.items.access.label')}: ${t('sections.rights.items.access.text')}`,
                                `${t('sections.rights.items.correction.label')}: ${t('sections.rights.items.correction.text')}`,
                                `${t('sections.rights.items.deletion.label')}: ${t('sections.rights.items.deletion.text')}`,
                                `${t('sections.rights.items.portability.label')}: ${t('sections.rights.items.portability.text')}`,
                                `${t('sections.rights.items.optOut.label')}: ${t('sections.rights.items.optOut.text')}`,
                                `${t('sections.rights.items.withdraw.label')}: ${t('sections.rights.items.withdraw.text')}`,
                            ]}
                        />
                        <PrivacyParagraph>{t('sections.rights.contact')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* Data Retention */}
                    <PrivacySection title={t('sections.retention.title')}>
                        <PrivacyParagraph>{t('sections.retention.text')}</PrivacyParagraph>
                        <PrivacyParagraph>{t('sections.retention.strava')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* Children's Privacy */}
                    <PrivacySection title={t('sections.children.title')}>
                        <PrivacyParagraph>{t('sections.children.text')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* International Transfers */}
                    <PrivacySection title={t('sections.transfers.title')}>
                        <PrivacyParagraph>{t('sections.transfers.text')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* Changes to Privacy Policy */}
                    <PrivacySection title={t('sections.changes.title')}>
                        <PrivacyParagraph>{t('sections.changes.text')}</PrivacyParagraph>
                    </PrivacySection>

                    {/* Contact Us */}
                    <PrivacySection title={t('sections.contact.title')}>
                        <PrivacyParagraph>{t('sections.contact.subtitle')}</PrivacyParagraph>
                        <PrivacyCallout>
                            <strong className="font-bold text-endurix-black dark:text-foreground">{t('sections.contact.emailLabel')}:</strong>{' '}
                            <a
                                href="mailto:privacy@endurix.app"
                                className="text-endurix-orange hover:underline"
                            >
                                privacy@endurix.app
                            </a>
                        </PrivacyCallout>
                    </PrivacySection>
                </article>
            </main>

            {/* Footer */}
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

function PrivacySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="border-l-2 border-endurix-orange pl-6 space-y-4">
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

function PrivacySubSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

function PrivacyParagraph({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-sm lg:text-base text-endurix-black/80 dark:text-foreground/80 leading-relaxed">
            {children}
        </p>
    );
}

function PrivacyList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2 pl-0 list-none">
            {items.map((item, i) => (
                <li
                    key={i}
                    className="relative pl-5 text-sm lg:text-base text-endurix-black/80 dark:text-foreground/80 leading-relaxed"
                >
                    <span
                        className="absolute left-0 top-2.5 w-2 h-px bg-endurix-orange"
                        aria-hidden
                    />
                    {item}
                </li>
            ))}
        </ul>
    );
}

function PrivacyCallout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-endurix-black dark:bg-muted p-5 border-l-4 border-endurix-orange">
            <p className="text-sm text-white/90 leading-relaxed">
                {children}
            </p>
        </div>
    );
}
