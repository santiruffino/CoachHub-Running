import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// Auth pages (login, password flows) carry no SEO value and must never be
// indexed. robots.txt already disallows /login; this is the stronger per-page
// signal that also covers the other auth routes.
export const metadata: Metadata = {
    title: 'Acceso',
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const t = await getTranslations('nav');

    return (
        <div className="min-h-screen grid place-items-center bg-background p-3 sm:p-4">
            <div className="w-full max-w-sm sm:max-w-md">
                <div className="flex justify-center mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tighter">
                        {t('brand')}
                    </h1>
                </div>
                {children}
            </div>
        </div>
    );
}
