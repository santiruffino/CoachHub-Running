import { createClient } from '@/lib/supabase/server';
import { User, Role } from '@/interfaces/auth';

/**
 * Fetch the current user + profile server-side.
 * Use this in Server Components (e.g. the root layout) to seed the
 * client-side AuthProvider with an initial value, so the UI never has
 * to make a network call to determine auth state.
 *
 * Returns null if there is no valid session.
 */
export async function getServerUser(): Promise<User | null> {
    const supabase = await createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (error || !profile) return null;

    return {
        id: profile.id,
        email: profile.email,
        name: profile.name || undefined,
        firstName: profile.first_name || undefined,
        lastName: profile.last_name || undefined,
        phone: profile.phone || undefined,
        gender: profile.gender || undefined,
        isOnboardingCompleted: profile.is_onboarding_completed || false,
        role: profile.role as Role,
        mustChangePassword: profile.must_change_password || false,
    };
}
