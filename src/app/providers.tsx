'use client';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import { CacheProvider } from '@/lib/context/CacheContext';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
                <CacheProvider>
                    {children}
                </CacheProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
