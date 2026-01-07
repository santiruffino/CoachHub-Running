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
    const supabase = createClient();

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
            if (session?.user) {
                // User logged in or session refreshed
                try {
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                } catch (error) {
                    console.error('Failed to fetch user profile', error);
                    setUser(null);
                }
            } else {
                // User logged out
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase.auth]);

    // Effect to enforce password change if user has the flag
    useEffect(() => {
        if (!loading && user?.mustChangePassword && window.location.pathname !== '/change-password') {
            router.push('/change-password');
        }
    }, [user, loading, router]);

    const login = async (email: string, password: string) => {
        const response = await authService.login(email, password);
        setUser(response.user);

        // Redirect based on status/role
        if (response.user.mustChangePassword) {
            router.push('/change-password');
            return;
        }

        if (response.user.role === 'COACH') {
            router.push('/dashboard');
        } else {
            router.push('/dashboard'); // Unified dashboard entry point
        }
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
