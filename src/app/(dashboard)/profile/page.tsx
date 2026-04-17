'use client';

import { useEffect, useState } from 'react';
import { ProfileDetails } from '@/features/profiles/types';
import { profileService } from '@/features/profiles/services/profile.service';
import { ProfileForm } from '@/features/profiles/components/ProfileForm';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { StravaStatusCard } from '@/features/strava/components/StravaStatusCard';
import { useStravaAuth } from '@/features/strava/hooks/useStravaAuth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SectionLayout, FieldGroup } from '@/components/layout/EditorialLayout';

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<ProfileDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const {
        status: stravaStatus,
        loading: stravaLoading,
        connect: connectStrava,
        disconnect: disconnectStrava,
        sync: refreshStrava,
    } = useStravaAuth({ enabled: user?.role === 'ATHLETE' });

    useEffect(() => {
        profileService
            .getProfile()
            .then((res) => setProfile(res.data))
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (authLoading || loading) {
        return (
            <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 space-y-10 pb-28">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-52" />
                    </div>
                </div>
                <div className="space-y-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    // ── Page ─────────────────────────────────────────────────────────────────
    const initials = user?.firstName
        ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) ?? ''}`
        : user?.name?.charAt(0) ?? 'U';

    const displayName =
        user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.name ?? user?.email ?? '';

    return (
        <div className="min-h-screen flex flex-col -mx-4 md:-mx-8 -mt-4 md:-mt-8">
            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto pb-28">
                <div className="max-w-6xl mx-auto px-6 md:px-10 pt-8">

                    {/* ── Page header ── */}
                    <div className="flex items-center gap-5 mb-8">
                        <Avatar className="h-14 w-14 shrink-0">
                            <AvatarFallback className="text-xl font-bold bg-muted text-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-0.5">
                                MI PERFIL
                            </p>
                            <h1 className="text-2xl md:text-3xl font-display font-light text-foreground">
                                {displayName}
                            </h1>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    {/* ── Editable form sections ── */}
                    {profile && <ProfileForm profile={profile} />}

                    {/* ── Strava section (athletes only) ── */}
                    {user?.role === 'ATHLETE' && (
                        <SectionLayout
                            tag="INTEGRACIONES"
                            title="Conexión con Strava"
                            description="Conecta tu cuenta de Strava para sincronizar actividades automáticamente."
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

                    {/* ── HR Zones section (athletes only) ── */}
                    {user?.role === 'ATHLETE' && profile?.athleteProfile && (
                        <SectionLayout
                            tag="ZONAS DE FC"
                            title="Frecuencia cardíaca"
                            description="Calculadas a partir de tu FC máxima y de reposo."
                        >
                            <FieldGroup>
                                <HeartRateZones zones={profile.athleteProfile.hrZones} />
                            </FieldGroup>
                        </SectionLayout>
                    )}

                </div>
            </div>

            {/* ── Sticky bottom save bar ── */}
            <div className="fixed bottom-16 md:bottom-0 inset-x-0 bg-background/80 backdrop-blur-md border-t border-border/20 z-40">
                <div className="max-w-6xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        Los cambios se guardan en tu perfil de inmediato.
                    </p>
                    <Button
                        type="submit"
                        form="profile-form"
                        className="ml-auto h-10 px-8 rounded-full font-medium text-sm"
                    >
                        Guardar cambios
                    </Button>
                </div>
            </div>
        </div>
    );
}
