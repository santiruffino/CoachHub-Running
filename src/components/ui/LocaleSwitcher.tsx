'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const switchLocale = () => {
        const next: Locale = locale === 'es' ? 'en' : 'es';
        document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <button
            onClick={switchLocale}
            disabled={isPending}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-endurix-black dark:text-foreground disabled:opacity-50"
            aria-label={`Switch to ${locale === 'es' ? 'English' : 'Español'}`}
            title={locale === 'es' ? 'English' : 'Español'}
        >
            <Languages className="w-4 h-4" strokeWidth={2} />
        </button>
    );
}
