import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileView } from '@/features/profiles/components/ProfileView';
import { ProfileDetails } from '@/interfaces/athlete';
import { User } from '@/interfaces/auth';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user: authUser },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
        redirect('/login');
    }

    // Fetch full profile data
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
            *,
            coachProfile:coach_profiles(*),
            athleteProfile:athlete_profiles(*)
        `)
        .eq('id', authUser.id)
        .single();

    if (profileError || !profile) {
        redirect('/dashboard');
    }

    // Transform to frontend structure
    const mappedProfile: ProfileDetails = {
        ...profile,
        firstName: profile.first_name,
        lastName: profile.last_name,
        isOnboardingCompleted: profile.is_onboarding_completed,
        mustChangePassword: profile.must_change_password,
        coachProfile: profile.coachProfile || null,
        athleteProfile: profile.athleteProfile ? {
            ...profile.athleteProfile,
            restHR: profile.athleteProfile.rest_hr,
            maxHR: profile.athleteProfile.max_hr,
            hrZones: profile.athleteProfile.hr_zones,
        } : null,
    } as unknown as ProfileDetails;

    const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        isOnboardingCompleted: profile.is_onboarding_completed
    };

    return (
        <div className="p-0">
            <ProfileView initialProfile={mappedProfile} user={user} />
        </div>
    );
}
