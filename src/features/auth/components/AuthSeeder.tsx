'use client';

import { useEffect } from 'react';
import type { User } from '@/interfaces/auth';
import { useAuth } from '../hooks/useAuth';

/**
 * Seeds the AuthContext with a user fetched server-side.
 *
 * Use this in server components (e.g. the dashboard layout) that have
 * access to the session cookie but live BELOW the AuthProvider in the
 * component tree. On mount it pushes the server-fetched user into the
 * context, so client components never have to make a network call to
 * determine auth state.
 */
export function AuthSeeder({ user }: { user: User | null }) {
    const { setUser } = useAuth();

    useEffect(() => {
        setUser(user);
    }, [user, setUser]);

    return null;
}
