import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ConnectStravaButtonProps {
    onConnect: () => void;
    loading?: boolean;
}

export function ConnectStravaButton({ onConnect, loading }: ConnectStravaButtonProps) {
    const t = useTranslations('strava.connectButton');

    return (
        <button
            onClick={onConnect}
            disabled={loading}
            className="relative inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            aria-label={t('ariaLabel')}
        >
            {loading ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#FC4C02] text-white rounded font-bold">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('connecting')}</span>
                </div>
            ) : (
                <Image
                    src="/strava-logos/btn_strava_connect_with_orange.svg"
                    alt={t('alt')}
                    width={193}
                    height={48}
                    className="h-12 w-auto"
                />
            )}
        </button>
    );
}
