import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-dark-navy">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-white/10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-light hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Privacy Policy</h1>
                <p className="text-sm text-gray-600 dark:text-gray-light mb-8">Last updated: February 14, 2026</p>

                <div className="prose prose-gray dark:prose-invert max-w-none">
                    {/* Introduction */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Introduction</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            Welcome to Coach Hub Running ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                        </p>
                        <p className="text-gray-700 dark:text-gray-light">
                            By using Coach Hub Running, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Information We Collect</h2>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Personal Information</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-2">We collect personal information that you voluntarily provide to us when you:</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>Register for an account (name, email address, password)</li>
                            <li>Create your athlete or coach profile (height, weight, heart rate zones, training preferences)</li>
                            <li>Connect third-party services (Strava, Garmin, etc.)</li>
                            <li>Contact us for support</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Activity Data</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-2">When you connect third-party fitness services, we collect:</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>Workout and activity data (distance, duration, pace, heart rate, elevation)</li>
                            <li>GPS location data from your recorded activities</li>
                            <li>Training history and performance metrics</li>
                            <li>Device information from connected fitness trackers</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Usage Information</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-2">We automatically collect certain information when you use our platform:</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2">
                            <li>Log data (IP address, browser type, operating system, pages visited)</li>
                            <li>Device information (device type, unique device identifiers)</li>
                            <li>Cookies and similar tracking technologies</li>
                        </ul>
                    </section>

                    {/* How We Use Your Information */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How We Use Your Information</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">We use the collected information for:</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2">
                            <li><strong>Providing Services:</strong> To create and manage your account, facilitate coach-athlete relationships, and deliver training plans</li>
                            <li><strong>Personalization:</strong> To customize your experience and provide relevant workout recommendations</li>
                            <li><strong>Analytics:</strong> To analyze your training data and provide insights on performance and progress</li>
                            <li><strong>Communication:</strong> To send you important updates, notifications about workouts, and messages from your coach</li>
                            <li><strong>Improvement:</strong> To understand how our platform is used and improve our features</li>
                            <li><strong>Security:</strong> To protect against unauthorized access and maintain the security of your data</li>
                            <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                        </ul>
                    </section>

                    {/* Third-Party Integrations */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Third-Party Integrations</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            Coach Hub Running integrates with third-party fitness platforms such as Strava, Garmin, and others. When you connect these services:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>You authorize us to access your activity data from these platforms</li>
                            <li>We are subject to their respective privacy policies and terms of service</li>
                            <li>You can disconnect these services at any time from your account settings</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-light">
                            We recommend reviewing the privacy policies of any third-party services you connect to understand how they handle your data.
                        </p>
                    </section>

                    {/* Data Sharing */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">How We Share Your Information</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">We may share your information in the following circumstances:</p>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">With Your Coach</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            When you join a coach or group, your coach will have access to your profile information, training data, and activity history to provide coaching services.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Service Providers</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            We may share data with trusted third-party service providers who assist us in operating our platform, such as hosting providers, analytics services, and email communication tools. These providers are contractually obligated to protect your information.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">Legal Requirements</h3>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            We may disclose your information if required by law, court order, or government request, or to protect our rights, property, or safety.
                        </p>

                        <p className="text-gray-700 dark:text-gray-light font-semibold">
                            We do not sell your personal information to third parties.
                        </p>
                    </section>

                    {/* Data Security */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Security</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-4">
                            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                        </p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li>Encryption of data in transit and at rest</li>
                            <li>Regular security assessments and updates</li>
                            <li>Access controls and authentication mechanisms</li>
                            <li>Secure cloud infrastructure</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-light">
                            However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                        </p>
                    </section>

                    {/* Your Rights */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Your Privacy Rights</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">Depending on your location, you may have the following rights:</p>
                        <ul className="list-disc pl-6 text-gray-700 dark:text-gray-light space-y-2 mb-4">
                            <li><strong>Access:</strong> Request access to your personal information we hold</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                            <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                            <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
                            <li><strong>Opt-Out:</strong> Opt out of marketing communications</li>
                            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
                        </ul>
                        <p className="text-gray-700 dark:text-gray-light">
                            To exercise these rights, please contact us at privacy@coachhub.com. We will respond to your request within 30 days.
                        </p>
                    </section>

                    {/* Data Retention */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Data Retention</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. When you delete your account, we will delete or anonymize your personal information within 90 days, except where we are required to retain it for legal or regulatory purposes.
                        </p>
                    </section>

                    {/* Children's Privacy */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Children's Privacy</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            Our service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately, and we will take steps to delete such information.
                        </p>
                    </section>

                    {/* International Transfers */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">International Data Transfers</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our service, you consent to the transfer of your information to these countries. We ensure appropriate safeguards are in place to protect your data.
                        </p>
                    </section>

                    {/* Changes to Privacy Policy */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Changes to This Privacy Policy</h2>
                        <p className="text-gray-700 dark:text-gray-light">
                            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically for any changes.
                        </p>
                    </section>

                    {/* Contact Us */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Contact Us</h2>
                        <p className="text-gray-700 dark:text-gray-light mb-2">
                            If you have any questions or concerns about this Privacy Policy or our privacy practices, please contact us:
                        </p>
                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mt-4">
                            <p className="text-gray-700 dark:text-gray-light"><strong>Email:</strong> privacy@coachhub.com</p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-white/10 mt-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-light">
                        © 2026 Coach Hub. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
