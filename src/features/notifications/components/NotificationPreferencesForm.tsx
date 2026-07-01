'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BellRing, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    notificationsService,
    NotificationCategory,
    NotificationFrequency,
    NotificationPreference,
} from '@/features/notifications/services/notifications.service';
import { usePushSubscription } from '@/features/notifications/hooks/usePushSubscription';

const FREQUENCIES: NotificationFrequency[] = ['immediate', 'daily', 'weekly'];

const SWITCH_TRACK_CLASSNAME =
    'border data-[state=checked]:border-endurix-orange data-[state=checked]:bg-endurix-orange data-[state=unchecked]:border-endurix-black/15 data-[state=unchecked]:bg-endurix-black/5 dark:data-[state=unchecked]:border-white/15 dark:data-[state=unchecked]:bg-white/5';
const SWITCH_THUMB_CLASSNAME = 'bg-white shadow-md ring-1 ring-black/5';

export function NotificationPreferencesForm() {
    const t = useTranslations('notifications.preferences');
    const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
    const [savingCategory, setSavingCategory] = useState<NotificationCategory | null>(null);
    const { supported, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushSubscription();
    const [togglingDevicePush, setTogglingDevicePush] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await notificationsService.getPreferences();
                if (!cancelled) setPreferences(res.data.preferences);
            } catch (err) {
                appLogger.error('Failed to load notification preferences:', err);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const updatePreference = async (preference: NotificationPreference, patch: Partial<NotificationPreference>) => {
        const next = { ...preference, ...patch };
        setSavingCategory(preference.category);
        setPreferences((prev) => prev?.map((item) => (item.category === preference.category ? next : item)) || null);

        try {
            await notificationsService.updatePreference(next);
        } catch (err) {
            appLogger.error('Failed to update notification preference:', err);
            setPreferences((prev) => prev?.map((item) => (item.category === preference.category ? preference : item)) || null);
        } finally {
            setSavingCategory(null);
        }
    };

    const handleDevicePushToggle = async (checked: boolean) => {
        setTogglingDevicePush(true);
        if (checked) {
            await subscribe();
        } else {
            await unsubscribe();
        }
        setTogglingDevicePush(false);
    };

    if (!preferences) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-endurix-black/10 dark:border-border bg-white/80 dark:bg-card px-4 py-3">
                <div className="flex items-start gap-3">
                    <BellRing className="mt-0.5 h-4 w-4 text-endurix-orange" />
                    <div>
                        <p className="text-sm font-semibold text-endurix-black dark:text-foreground">
                            {t('devicePushTitle')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {supported ? t('devicePushDescription') : t('devicePushUnsupported')}
                        </p>
                    </div>
                </div>
                {pushLoading || togglingDevicePush ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Switch
                        checked={subscribed}
                        disabled={!supported}
                        onCheckedChange={(checked) => void handleDevicePushToggle(checked)}
                        className={SWITCH_TRACK_CLASSNAME}
                        thumbClassName={SWITCH_THUMB_CLASSNAME}
                    />
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-endurix-black/10 dark:border-border">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3">{t('table.category')}</th>
                            <th className="px-4 py-3 text-center">{t('table.inApp')}</th>
                            <th className="px-4 py-3 text-center">{t('table.push')}</th>
                            <th className="px-4 py-3 text-center">{t('table.frequency')}</th>
                            <th className="px-4 py-3 text-center">{t('table.email')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {preferences.map((preference) => {
                            const category = preference.category as NotificationCategory;
                            const isSaving = savingCategory === category;

                            return (
                                <tr key={category} className="border-b border-endurix-black/8 dark:border-border last:border-0">
                                    <td className="px-4 py-3 font-medium text-endurix-black dark:text-foreground">
                                        {t(`categories.${category}`)}
                                        {isSaving && <Loader2 className="ml-2 inline h-3 w-3 animate-spin text-muted-foreground" />}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Switch
                                            checked={preference.in_app_enabled}
                                            onCheckedChange={(checked) => void updatePreference(preference, { in_app_enabled: checked })}
                                            className={SWITCH_TRACK_CLASSNAME}
                                            thumbClassName={SWITCH_THUMB_CLASSNAME}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Switch
                                            checked={preference.push_enabled}
                                            onCheckedChange={(checked) => void updatePreference(preference, { push_enabled: checked })}
                                            className={SWITCH_TRACK_CLASSNAME}
                                            thumbClassName={SWITCH_THUMB_CLASSNAME}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Select
                                            value={preference.frequency}
                                            onValueChange={(value) =>
                                                void updatePreference(preference, { frequency: value as NotificationFrequency })
                                            }
                                        >
                                            <SelectTrigger className="h-9 w-32 mx-auto rounded-none border-endurix-black/20 dark:border-border bg-transparent text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FREQUENCIES.map((frequency) => (
                                                    <SelectItem key={frequency} value={frequency}>
                                                        {t(`frequencies.${frequency}`)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="rounded-full bg-endurix-black/5 dark:bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {t('comingSoon')}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
