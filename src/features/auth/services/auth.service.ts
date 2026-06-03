import { createClient } from '@/lib/supabase/client';
import { User, Role } from '@/interfaces/auth';
import { appLogger } from '@/lib/app-logger';

interface SignOutResult {
    error: Error | null;
}

export interface LoginResponse {
    user: User;
}

export interface SignUpParams {
    email: string;
    password: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    role?: Role;
}

export const authService = {
    /**
     * Sign up a new user with Supabase Auth and create a profile.
     * Best practice: Call this from a server action or API route for security.
     */
    signUp: async (params: SignUpParams): Promise<User> => {
        const supabase = createClient();
        const { email, password, name, firstName, lastName, phone, gender, role } = params;

        // 1. Create user in Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });
        if (signUpError) {
            throw new Error(signUpError.message);
        }
        const user = signUpData.user;
        if (!user) {
            throw new Error('Sign up failed');
        }

        // 2. Insert profile in DB (optional, but recommended)
        const { error: profileError } = await supabase.from('profiles').insert([
            {
                id: user.id,
                email,
                name: name || null,
                first_name: firstName || null,
                last_name: lastName || null,
                phone: phone || null,
                gender: gender || null,
                role: role || Role.ATHLETE,
                is_onboarding_completed: false,
                must_change_password: false,
            },
        ]);
        if (profileError) {
            throw new Error(profileError.message);
        }

        // 3. Return user object
        return {
            id: user.id,
            email: user.email!,
            name: name || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phone: phone || undefined,
            gender: gender || undefined,
            isOnboardingCompleted: false,
            role: role || Role.ATHLETE,
            mustChangePassword: false,
        };
    },

    login: async (email: string, password: string): Promise<void> => {
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
    },

    logout: async (): Promise<void> => {
        const supabase = createClient();

        try {
            // Attempt Supabase signOut with a timeout to prevent hanging
            // We remove scope: 'local' to ensure cookies are cleared correctly
            const { error } = await Promise.race([
                supabase.auth.signOut(),
                new Promise<SignOutResult>((_, reject) =>
                    setTimeout(() => reject(new Error('SignOut timeout')), 3000)
                )
            ]) as SignOutResult;

            if (error) {
                appLogger.error('❌ [AuthService] signOut failed:', error);
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'SignOut timeout') {
                appLogger.warn('⚠️ [AuthService] signOut timed out - proceeding with local cleanup');
            } else {
                appLogger.error('❌ [AuthService] signOut error:', error);
            }
        }
    },

    updatePassword: async (newPassword: string): Promise<void> => {
        const supabase = createClient();

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            appLogger.error('❌ [AuthService] updateUser failed:', error);
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
                appLogger.error('❌ [AuthService] Profile update failed:', updateError);
                throw new Error('Failed to update profile');
            }
        } else {
            appLogger.warn('⚠️ [AuthService] No user found after password update');
        }

    },

    resetPassword: async (email: string): Promise<void> => {
        const supabase = createClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        if (error) {
            appLogger.error('❌ [AuthService] resetPasswordForEmail failed:', error);
            throw new Error(error.message);
        }

    },

    sendMagicLink: async (email: string): Promise<void> => {
        const supabase = createClient();

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            appLogger.error('❌ [AuthService] signInWithOtp failed:', error);
            throw new Error(error.message);
        }
    },

    getCurrentUser: async (): Promise<User | null> => {
        const supabase = createClient();

        // getSession() reads the local cookie. Prefer this over getUser() for
        // the initial check — getUser() makes a network call that can hang
        // when the auth endpoint is slow.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;

        if (sessionError || !authUser) {
            return null;
        }

        // Fetch profile (with timeout safety net so the UI never hangs)
        const profileResult = await Promise.race([
            supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single(),
            new Promise<{ data: null; error: Error }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 5000)
            ),
        ]);
        const profile = profileResult.data;
        const profileError = profileResult.error;

        if (profileError) {
            appLogger.error('getCurrentUser profile error:', profileError);
            return null;
        }

        if (!profile) {
            appLogger.error('getCurrentUser: Profile is null for user ID:', authUser.id);
            return null;
        }

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
    },
};
