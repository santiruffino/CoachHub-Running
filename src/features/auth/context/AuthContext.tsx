'use client';
import { appLogger } from '@/lib/app-logger';


import { createContext, useEffect, useState } from 'react';
import { User } from '@/interfaces/auth';
import { authService } from '../services/auth.service';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { trackAuthenticatedSession } from '@/lib/analytics/events';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
    children,
    initialUser = null,
}: {
    children: React.ReactNode;
    initialUser?: User | null;
}) {
    // The user is seeded server-side from the root layout, so the client
    // never has to make a network call to determine auth state.
    const [user, setUser] = useState<User | null>(initialUser);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    // Use useState to ensure supabase client is only created once
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        // Listen for auth state changes (login, logout, token refresh).
        // We do NOT call getCurrentUser on mount — the server has already
        // provided the initial user via the root layout.
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
                    if (currentUser) {
                        trackAuthenticatedSession({
                            role: currentUser.role,
                            onboardingCompleted: currentUser.isOnboardingCompleted,
                        });
                    }
                } catch (error) {
                    appLogger.error('Failed to fetch user profile', error);
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

    // Effect to enforce onboarding completion for coaches
    useEffect(() => {
        if (!loading && user?.role === 'COACH' && user?.isOnboardingCompleted === false && window.location.pathname !== '/onboarding/coach') {
            router.push('/onboarding/coach');
        }
    }, [user, loading, router]);

    const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Login failed');
    }
    setUser(data.user);
};

    const logout = async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        appLogger.error('❌ [AuthContext] Logout failed', e);
    } finally {
        setUser(null);
        window.location.href = '/login';
    }
};

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}
