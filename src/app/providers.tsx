'use client';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import { ThemeProvider } from 'next-themes';
import type { User } from '@/interfaces/auth';

export function Providers({ children, initialUser }: { children: React.ReactNode; initialUser?: User | null }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider initialUser={initialUser}>
                {children}
            </AuthProvider>
        </ThemeProvider>
    );
}
