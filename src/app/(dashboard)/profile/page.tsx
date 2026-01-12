'use client';

import { useEffect, useState } from 'react';
import { ProfileDetails } from '@/features/profiles/types';
import { profileService } from '@/features/profiles/services/profile.service';
import { ProfileForm } from '@/features/profiles/components/ProfileForm';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { StravaStatusCard } from '@/features/strava/components/StravaStatusCard';
import { useStravaAuth } from '@/features/strava/hooks/useStravaAuth';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileDetails | null>(null);
    const [loading, setLoading] = useState(true);

    const {
        status: stravaStatus,
        loading: stravaLoading,
        connect: connectStrava,
        disconnect: disconnectStrava,
        refreshStatus: refreshStatusOnly,
        sync: refreshStrava // Mapping sync function to the name used in render
    } = useStravaAuth();

    useEffect(() => {
        profileService.getProfile().then(res => {
            setProfile(res.data);
        }).catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading profile...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Your Profile</h1>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center">
                        <Avatar className="h-16 w-16">
                            <AvatarFallback className="text-xl font-bold">
                                {user?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                            <h2 className="text-xl font-medium">{user?.name}</h2>
                            <p className="text-muted-foreground">{user?.email}</p>
                            <Badge variant="secondary" className="mt-1">
                                {user?.role}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Strava Integration Section */}
            {user?.role === 'ATHLETE' && (
                <div className="mb-6">
                    <StravaStatusCard
                        status={stravaStatus}
                        loading={stravaLoading}
                        onConnect={connectStrava}
                        onDisconnect={disconnectStrava}
                        onRefresh={refreshStrava}
                    />
                </div>
            )}

            {/* Heart Rate Zones */}
            {user?.role === 'ATHLETE' && profile?.athleteProfile && (
                <HeartRateZones zones={profile.athleteProfile.hrZones} />
            )}

            {profile && <ProfileForm profile={profile} />}
        </div>
    );
}
