import { getTranslations } from 'next-intl/server';

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
