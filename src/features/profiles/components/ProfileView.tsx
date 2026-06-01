'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileDetails } from '@/interfaces/athlete';
import { ProfileForm } from '@/features/profiles/components/ProfileForm';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { StravaStatusCard } from '@/features/strava/components/StravaStatusCard';
import { useStravaAuth } from '@/features/strava/hooks/useStravaAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SectionLayout, FieldGroup } from '@/components/layout/EditorialLayout';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { User } from '@/interfaces/auth';

interface ProfileViewProps {
    initialProfile: ProfileDetails;
    user: User;
}

export function ProfileView({ initialProfile, user }: ProfileViewProps) {
    const t = useTranslations('profile.page');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const [profile] = useState<ProfileDetails>(initialProfile);

    const {
        status: stravaStatus,
        loading: stravaLoading,
        connect: connectStrava,
        disconnect: disconnectStrava,
        sync: refreshStrava,
    } = useStravaAuth({ enabled: user?.role === 'ATHLETE' });

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
                <div className="max-w-6xl mx-auto px-6 md:px-10 pt-8">

                    <div className="flex items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
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
                            <StravaStatusCard
                                status={stravaStatus}
                                loading={stravaLoading}
                                onConnect={connectStrava}
                                onDisconnect={disconnectStrava}
                                onRefresh={refreshStrava}
                            />
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

                </div>
            </div>

            <div className="fixed bottom-16 md:bottom-0 inset-x-0 bg-endurix-paper/90 dark:bg-background/90 backdrop-blur-md border-t border-endurix-black/10 dark:border-border z-40">
                <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
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
