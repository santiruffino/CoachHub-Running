import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
    const t = await getTranslations('legal.privacy');

    return (
        <div className="min-h-screen bg-white dark:bg-dark-navy">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-light hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {t('backToHome')}
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('title')}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-light mb-8">{t('lastUpdated')}</p>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    {/* Introduction */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.introduction.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            {t('sections.introduction.p1')}
                        </p>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.introduction.p2')}
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.collect.title')}</h2>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t('sections.collect.personal.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-2">{t('sections.collect.personal.subtitle')}</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>{t('sections.collect.personal.items.account')}</li>
                            <li>{t('sections.collect.personal.items.profile')}</li>
                            <li>{t('sections.collect.personal.items.integrations')}</li>
                            <li>{t('sections.collect.personal.items.support')}</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t('sections.collect.activity.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-2">{t('sections.collect.activity.subtitle')}</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>{t('sections.collect.activity.items.workout')}</li>
                            <li>{t('sections.collect.activity.items.gps')}</li>
                            <li>{t('sections.collect.activity.items.history')}</li>
                            <li>{t('sections.collect.activity.items.device')}</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t('sections.collect.usage.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-2">{t('sections.collect.usage.subtitle')}</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2">
                            <li>{t('sections.collect.usage.items.logData')}</li>
                            <li>{t('sections.collect.usage.items.deviceInfo')}</li>
                            <li>{t('sections.collect.usage.items.cookies')}</li>
                        </ul>
                    </section>

                    {/* How We Use Your Information */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.usage.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">{t('sections.usage.subtitle')}</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2">
                            <li><strong>{t('sections.usage.items.services.label')}:</strong> {t('sections.usage.items.services.text')}</li>
                            <li><strong>{t('sections.usage.items.personalization.label')}:</strong> {t('sections.usage.items.personalization.text')}</li>
                            <li><strong>{t('sections.usage.items.analytics.label')}:</strong> {t('sections.usage.items.analytics.text')}</li>
                            <li><strong>{t('sections.usage.items.communication.label')}:</strong> {t('sections.usage.items.communication.text')}</li>
                            <li><strong>{t('sections.usage.items.improvement.label')}:</strong> {t('sections.usage.items.improvement.text')}</li>
                            <li><strong>{t('sections.usage.items.security.label')}:</strong> {t('sections.usage.items.security.text')}</li>
                            <li><strong>{t('sections.usage.items.compliance.label')}:</strong> {t('sections.usage.items.compliance.text')}</li>
                        </ul>
                    </section>

                    {/* Third-Party Integrations */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.integrations.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            {t('sections.integrations.p1')}
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>{t('sections.integrations.items.auth')}</li>
                            <li>{t('sections.integrations.items.policies')}</li>
                            <li>{t('sections.integrations.items.disconnect')}</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.integrations.p2')}
                        </p>
                    </section>

                    {/* Data Sharing */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.sharing.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">{t('sections.sharing.subtitle')}</p>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t('sections.sharing.coach.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            {t('sections.sharing.coach.text')}
                        </p>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t('sections.sharing.providers.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            {t('sections.sharing.providers.text')}
                        </p>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">{t('sections.sharing.legal.title')}</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            {t('sections.sharing.legal.text')}
                        </p>

                        <p className="text-gray-700 dark:text-gray-light font-semibold">
                            {t('sections.sharing.noSell')}
                        </p>
                    </section>

                    {/* Data Security */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.security.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            {t('sections.security.p1')}
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>{t('sections.security.items.encryption')}</li>
                            <li>{t('sections.security.items.assessments')}</li>
                            <li>{t('sections.security.items.accessControls')}</li>
                            <li>{t('sections.security.items.infrastructure')}</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.security.p2')}
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.rights.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">{t('sections.rights.subtitle')}</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li><strong>{t('sections.rights.items.access.label')}:</strong> {t('sections.rights.items.access.text')}</li>
                            <li><strong>{t('sections.rights.items.correction.label')}:</strong> {t('sections.rights.items.correction.text')}</li>
                            <li><strong>{t('sections.rights.items.deletion.label')}:</strong> {t('sections.rights.items.deletion.text')}</li>
                            <li><strong>{t('sections.rights.items.portability.label')}:</strong> {t('sections.rights.items.portability.text')}</li>
                            <li><strong>{t('sections.rights.items.optOut.label')}:</strong> {t('sections.rights.items.optOut.text')}</li>
                            <li><strong>{t('sections.rights.items.withdraw.label')}:</strong> {t('sections.rights.items.withdraw.text')}</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.rights.contact')}
                        </p>
                    </section>

                    {/* Data Retention */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.retention.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.retention.text')}
                        </p>
                    </section>

                    {/* Children's Privacy */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.children.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.children.text')}
                        </p>
                    </section>

                    {/* International Transfers */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.transfers.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.transfers.text')}
                        </p>
                    </section>

                    {/* Changes to Privacy Policy */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.changes.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            {t('sections.changes.text')}
                        </p>
                    </section>

                    {/* Contact Us */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('sections.contact.title')}</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">
                            {t('sections.contact.subtitle')}
                        </p>
                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mt-4">
                            <p className="text-gray-700 dark:text-gray-light"><strong>{t('sections.contact.emailLabel')}:</strong> privacy@coachhub.com</p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-white/10 mt-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-light">
                        {t('footer')}
                    </p>
                </div>
            </footer>
        </div>
    );
}
