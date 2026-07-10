'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfileDetails } from '@/interfaces/athlete';
import { ProfileForm } from '@/features/profiles/components/ProfileForm';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { StravaStatusCard } from '@/features/strava/components/StravaStatusCard';
import { useStravaAuth } from '@/features/strava/hooks/useStravaAuth';
import { GarminStatusCard } from '@/features/garmin/components/GarminStatusCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SectionLayout, FieldGroup } from '@/components/layout/EditorialLayout';
import { BackButton } from '@/components/ui/BackButton';
import { useTranslations } from 'next-intl';
import { User } from '@/interfaces/auth';
import { garminService, type GarminDebugSection, type GarminDebugResponse } from '@/features/garmin/services/garmin.service';

interface ProfileViewProps {
    initialProfile: ProfileDetails;
    user: User;
}

export function ProfileView({ initialProfile, user }: ProfileViewProps) {
    const t = useTranslations('profile.page');
    const tCommon = useTranslations('common');
    const tGarmin = useTranslations('garmin');
    const [profile] = useState<ProfileDetails>(initialProfile);
    const garminPilotEnabled = Boolean(profile.garmin_pilot_enabled);
    const [debugSection, setDebugSection] = useState<GarminDebugSection>('status');
    const [debugPayload, setDebugPayload] = useState<GarminDebugResponse | null>(null);
    const [debugLoading, setDebugLoading] = useState(false);
    const [debugError, setDebugError] = useState<string | null>(null);

    const {
        status: stravaStatus,
        loading: stravaLoading,
        connect: connectStrava,
        disconnect: disconnectStrava,
        sync: refreshStrava,
    } = useStravaAuth({ enabled: user?.role === 'ATHLETE' });

    useEffect(() => {
        if (!garminPilotEnabled || user?.role !== 'ATHLETE') return;

        let cancelled = false;

        const loadDebugInfo = async () => {
            try {
                setDebugLoading(true);
                setDebugError(null);
                const data = await garminService.getDebugInfo(debugSection);
                if (!cancelled) {
                    setDebugPayload(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setDebugError(error instanceof Error ? error.message : tGarmin('debugLoadError'));
                }
            } finally {
                if (!cancelled) {
                    setDebugLoading(false);
                }
            }
        };

        void loadDebugInfo();

        return () => {
            cancelled = true;
        };
    }, [debugSection, garminPilotEnabled, user?.role]);

    const refreshDebugInfo = async () => {
        try {
            setDebugLoading(true);
            setDebugError(null);
            const data = await garminService.getDebugInfo(debugSection);
            setDebugPayload(data);
        } catch (error) {
            setDebugError(error instanceof Error ? error.message : tGarmin('debugLoadError'));
        } finally {
            setDebugLoading(false);
        }
    };

    const initials = profile.firstName
        ? `${profile.firstName.charAt(0)}${profile.lastName?.charAt(0) ?? ''}`
        : profile.name?.charAt(0) ?? 'U';

    const displayName =
        profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : profile.name ?? profile.email ?? '';

    return (
        <div className="flex flex-col">
            <div className="flex-1 overflow-y-auto pb-28">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8">

                    <div className="mb-4">
                        <BackButton showLabel />
                    </div>
                    <div className="flex items-center gap-5 mb-8">
                        <Avatar className="h-14 w-14 shrink-0">
                            <AvatarFallback
                                className="text-xl font-bold bg-endurix-black/8 dark:bg-white/10 text-endurix-black dark:text-foreground"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p
                                className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-0.5"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {t('headerTag')}
                            </p>
                            <h1
                                className="text-2xl sm:text-3xl font-bold text-endurix-black dark:text-foreground tracking-tight uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {displayName}
                            </h1>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                        </div>
                    </div>

                    <ProfileForm profile={profile} />

                    {user?.role === 'ATHLETE' && (
                        <SectionLayout
                            tag={t('integrations.tag')}
                            title={t('integrations.title')}
                            description={t('integrations.description')}
                        >
                            <FieldGroup className="overflow-hidden rounded-xl p-0 space-y-0 divide-y divide-endurix-black/10 dark:divide-border">
                                <StravaStatusCard
                                    status={stravaStatus}
                                    loading={stravaLoading}
                                    onConnect={connectStrava}
                                    onDisconnect={disconnectStrava}
                                    onRefresh={refreshStrava}
                                />
                                {/* Renders only for pilot athletes (gated by status.available). */}
                                <div id="garmin" className="w-full scroll-mt-24">
                                    <GarminStatusCard enabled={user?.role === 'ATHLETE' && garminPilotEnabled} />
                                </div>
                            </FieldGroup>
                        </SectionLayout>
                    )}

                    {garminPilotEnabled && user?.role === 'ATHLETE' && (
                        <SectionLayout
                            tag="Garmin"
                            title="Debug console"
                            description="Select the Garmin slice you want to inspect."
                        >
                            <FieldGroup className="overflow-hidden rounded-xl p-0 space-y-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-endurix-black/10 dark:border-border px-4 py-3">
                                    <div>
                                        <p
                                            className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground"
                                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                        >
                                            Inspect
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Useful for checking the exact fields we receive from Garmin.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={debugSection}
                                            onChange={(e) => setDebugSection(e.target.value as GarminDebugSection)}
                                            className="h-10 rounded-md border border-endurix-black/15 dark:border-border bg-background px-3 text-sm"
                                        >
                                            <option value="status">Connection status</option>
                                            <option value="profile">getUserProfile()</option>
                                            <option value="settings">getUserSettings()</option>
                                        </select>
                                        <Button variant="outline-brand" onClick={refreshDebugInfo} disabled={debugLoading}>
                                            Refresh
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/40 dark:bg-muted/20">
                                    <pre
                                        className="overflow-x-auto rounded-lg border border-endurix-black/10 dark:border-border bg-endurix-black/[0.03] dark:bg-black/30 p-4 text-[11px] leading-5 text-endurix-black/80 dark:text-muted-foreground"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {debugLoading
                                            ? 'Loading Garmin debug...'
                                            : debugError
                                                ? debugError
                                                : JSON.stringify(debugPayload, null, 2)}
                                    </pre>
                                </div>
                            </FieldGroup>
                        </SectionLayout>
                    )}

                    {user?.role === 'ATHLETE' && profile.athleteProfile && (
                        <SectionLayout
                            tag={t('hrZones.tag')}
                            title={t('hrZones.title')}
                            description={t('hrZones.description')}
                        >
                            <FieldGroup>
                                <HeartRateZones zones={profile.athleteProfile.hrZones} />
                            </FieldGroup>
                        </SectionLayout>
                    )}

                    <SectionLayout
                        tag={t('notificationSettings.tag')}
                        title={t('notificationSettings.title')}
                        description={t('notificationSettings.description')}
                    >
                        <Button asChild variant="outline-brand" className="uppercase tracking-widest text-xs">
                            <Link href="/settings/notifications">{t('notificationSettings.cta')}</Link>
                        </Button>
                    </SectionLayout>

                </div>
            </div>

            <div className="fixed bottom-16 md:bottom-0 inset-x-0 bg-endurix-paper/90 dark:bg-background/90 backdrop-blur-md border-t border-endurix-black/10 dark:border-border z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {t('saveHint')}
                    </p>
                    <Button
                        type="submit"
                        variant="orange"
                        form="profile-form"
                        className="ml-auto h-10 px-8 font-medium text-sm uppercase tracking-widest"
                    >
                        {tCommon('save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
