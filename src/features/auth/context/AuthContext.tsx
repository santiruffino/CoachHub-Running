'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/interfaces/auth';
import { authService } from '../services/auth.service';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    // Use useState to ensure supabase client is only created once
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        // Get initial session
        const initializeAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch (error) {
                console.error('Failed to get current user', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {

            if (event === 'PASSWORD_RECOVERY') {
                router.push('/reset-password');
                return;
            }

            if (session?.user) {
                // User logged in or session refreshed
                try {
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                } catch (error) {
                    console.error('Failed to fetch user profile', error);
                    setUser(null);
                }
            } else if (event === 'SIGNED_OUT') {
                // Explicitly handle sign out
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase.auth, router]);

    // Effect to enforce password change if user has the flag
    useEffect(() => {
        if (!loading && user?.mustChangePassword && window.location.pathname !== '/change-password') {
            router.push('/change-password');
        }
    }, [user, loading, router]);

    // Effect to enforce onboarding completion for athletes
    useEffect(() => {
        if (!loading && user?.role === 'ATHLETE' && user?.isOnboardingCompleted === false && window.location.pathname !== '/onboarding') {
            router.push('/onboarding');
        }
    }, [user, loading, router]);

    const login = async (email: string, password: string) => {
        await authService.login(email, password);

        // Fetch user manually here so we can await it before redirecting,
        // rather than relying only on the onAuthStateChange listener
        // which could cause race conditions with form submission state.
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        } else {
            throw new Error('Failed to fetch user profile');
        }
    };

    const logout = async () => {
        // 1. Clear state immediately
        setUser(null);

        // 2. Redirect immediately
        router.push('/login');

        // 3. Perform backend cleanup in background
        try {
            await authService.logout();
        } catch (e) {
            console.error('❌ [AuthContext] Logout background task failed', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
