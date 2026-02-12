import { createClient } from '@/lib/supabase/client';
import { User, Profile, Role } from '../types';

export interface LoginResponse {
    user: User;
}

export const authService = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const supabase = createClient();

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            throw new Error(authError.message);
        }

        if (!authData.user) {
            throw new Error('Login failed');
        }

        // Fetch user profile from profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            throw new Error(`Failed to fetch user profile: ${profileError.message}`);
        }

        if (!profile) {
            console.error('Profile is null for user ID:', authData.user.id);
            throw new Error('Profile not found. Please contact your administrator.');
        }

        // Map profile to User type
        const user: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name || undefined,
            role: profile.role as Role,
            mustChangePassword: profile.must_change_password || false,
        };

        return { user };
    },

    logout: async (): Promise<void> => {
        const supabase = createClient();

        // 1. Clear local storage immediately
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }

        try {
            // 2. Attempt Supabase signOut with a timeout to prevent hanging
            const signOutPromise = supabase.auth.signOut({ scope: 'local' });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('SignOut timeout')), 2000)
            );

            await Promise.race([signOutPromise, timeoutPromise]);
        } catch (error: any) {
            if (error.message === 'SignOut timeout') {
                console.warn('⚠️ [AuthService] Background signOut timed out - Local session cleared successfully');
            } else {
                console.error('❌ [AuthService] Background signOut failed:', error);
            }
        }
    },

    updatePassword: async (newPassword: string): Promise<void> => {
        const supabase = createClient();

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            console.error('❌ [AuthService] updateUser failed:', error);
            throw new Error(error.message);
        }


        // Clear must_change_password flag
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', user.id);

            if (updateError) {
                console.error('❌ [AuthService] Profile update failed:', updateError);
                throw new Error('Failed to update profile');
            }
        } else {
            console.warn('⚠️ [AuthService] No user found after password update');
        }

    },

    resetPassword: async (email: string): Promise<void> => {
        const supabase = createClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        if (error) {
            console.error('❌ [AuthService] resetPasswordForEmail failed:', error);
            throw new Error(error.message);
        }

    },

    getCurrentUser: async (): Promise<User | null> => {
        const supabase = createClient();

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
            return null;
        }

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (profileError) {
            console.error('getCurrentUser profile error:', profileError);
            return null;
        }

        if (!profile) {
            console.error('getCurrentUser: Profile is null for user ID:', authUser.id);
            return null;
        }

        return {
            id: profile.id,
            email: profile.email,
            name: profile.name || undefined,
            role: profile.role as Role,
            mustChangePassword: profile.must_change_password || false,
        };
    },
};
