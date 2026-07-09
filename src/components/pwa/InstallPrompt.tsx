'use client';

import { useEffect, useState } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'endurix.pwa.installPrompt.dismissed';

function isIos() {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
}

export function InstallPrompt() {
    const t = useTranslations('pwa');
    const [showIosPrompt, setShowIosPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (isInStandaloneMode()) return;
        if (sessionStorage.getItem(DISMISSED_KEY)) return;

        if (isIos()) {
            const timer = setTimeout(() => setShowIosPrompt(true), 3000);
            return () => clearTimeout(timer);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const dismiss = () => {
        sessionStorage.setItem(DISMISSED_KEY, '1');
        setShowIosPrompt(false);
        setDeferredPrompt(null);
    };

    const handleAndroidInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    if (!showIosPrompt && !deferredPrompt) return null;

    return (
        <div className="md:hidden fixed bottom-20 left-3 right-3 z-50 rounded-xl border border-endurix-black/10 dark:border-white/10 bg-endurix-paper dark:bg-card shadow-lg p-4">
            <button
                onClick={dismiss}
                className="absolute top-3 right-3 text-endurix-black/40 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground"
                aria-label={t('close')}
            >
                <X className="h-4 w-4" />
            </button>

            {showIosPrompt ? (
                <div className="space-y-2 pr-4">
                    <p className="text-sm font-semibold text-endurix-black dark:text-foreground">
                        {t('iosTitle')}
                    </p>
                    <p className="text-xs text-endurix-black/60 dark:text-muted-foreground leading-relaxed">
                        {t.rich('iosInstructions', {
                            shareIcon: () => <Share className="inline h-3.5 w-3.5 mx-0.5 relative -top-px" />,
                            addToHome: (chunks) => <strong className="font-medium text-endurix-black dark:text-foreground">&ldquo;{chunks}&rdquo;</strong>,
                            plusIcon: () => <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 relative -top-px" />,
                        })}
                    </p>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 pr-4">
                    <div>
                        <p className="text-sm font-semibold text-endurix-black dark:text-foreground">
                            {t('androidTitle')}
                        </p>
                        <p className="text-xs text-endurix-black/60 dark:text-muted-foreground">
                            {t('androidSubtitle')}
                        </p>
                    </div>
                    <Button size="sm" onClick={handleAndroidInstall} className="shrink-0">
                        {t('installButton')}
                    </Button>
                </div>
            )}
        </div>
    );
}
