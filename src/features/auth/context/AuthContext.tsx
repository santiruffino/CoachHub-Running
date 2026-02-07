'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
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
            console.log('🚀 [AuthContext] Initializing auth...');
            try {
                const currentUser = await authService.getCurrentUser();
                console.log('✅ [AuthContext] Current user fetched:', currentUser ? 'Found' : 'Null');
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
            console.log('🔐 [AuthContext] Auth State Change:', event);
            console.log('🔍 [AuthContext] Session:', session ? 'Exists' : 'Null');
            if (session?.user) console.log('👤 [AuthContext] User ID:', session.user.id);
            if (typeof window !== 'undefined') console.log('🌐 [AuthContext] URL Hash:', window.location.hash);

            if (event === 'PASSWORD_RECOVERY') {
                console.log('🛑 [AuthContext] PASSWORD_RECOVERY event detected! Redirecting...');
                router.push('/reset-password');
                return;
            }

            if (session?.user) {
                // User logged in or session refreshed
                console.log('🔄 [AuthContext] User detected, fetching profile...');
                try {
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                    console.log('✅ [AuthContext] User profile updated');
                } catch (error) {
                    console.error('Failed to fetch user profile', error);
                    setUser(null);
                }
            } else if (event === 'SIGNED_OUT') {
                // Explicitly handle sign out
                setUser(null);
                console.log('👋 [AuthContext] Signed out');
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

    const login = async (email: string, password: string) => {
        console.log('🔑 [AuthContext] Manual login called');
        const response = await authService.login(email, password);

        // Update user state - this will trigger effects/re-renders
        setUser(response.user);
        console.log('✅ [AuthContext] Manual login successful, state updated');

        // Redirection is handled by useEffects in AuthContext or components
    };

    const logout = async () => {
        console.log('👋 [AuthContext] Logout called - Starting optimistic cleanup');

        // 1. Clear state immediately
        setUser(null);

        // 2. Redirect immediately
        console.log('🔄 [AuthContext] Redirecting to login (Optimistic)');
        router.push('/login');

        // 3. Perform backend cleanup in background
        try {
            await authService.logout();
            console.log('✅ [AuthContext] AuthService.logout finished (Background)');
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
