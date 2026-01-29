'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../services/auth.service';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const { user } = useAuth();
    const router = useRouter();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        const checkSession = async () => {
            console.log('🔍 [ResetPasswordForm] Checking for active session...');

            // Check for recovery token in URL hash (Supabase format)
            const hasHashToken = typeof window !== 'undefined' &&
                (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token'));

            // Check for recovery token in query parameters (code parameter)
            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const codeParam = urlParams?.get('code');
            const hasCodeParam = !!codeParam;

            console.log('🔍 [ResetPasswordForm] Token check - Hash:', hasHashToken, 'Code param:', hasCodeParam);

            if (!hasHashToken && !hasCodeParam) {
                console.warn('⚠️ [ResetPasswordForm] No recovery token in URL - skipping session check');
                setHasSession(false);
                setCheckingSession(false);
                return;
            }

            const supabase = createClient();

            // If there's a code parameter, exchange it for a session
            if (hasCodeParam && codeParam) {
                console.log('✅ [ResetPasswordForm] Code parameter found, exchanging for session...');

                // First, sign out any existing session to avoid conflicts
                const { data: { session: existingSession } } = await supabase.auth.getSession();
                if (existingSession) {
                    console.log('🔄 [ResetPasswordForm] Existing session detected, signing out first...');
                    await supabase.auth.signOut({ scope: 'local' });
                }

                // Exchange the code for a session
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeParam);

                if (exchangeError) {
                    console.error('❌ [ResetPasswordForm] Failed to exchange code for session:', exchangeError);
                    setHasSession(false);
                    setCheckingSession(false);
                    return;
                }

                console.log('✅ [ResetPasswordForm] Code exchanged successfully, checking session...');
            }

            console.log('✅ [ResetPasswordForm] Recovery token found in URL, checking session...');

            // Retry up to 3 times with 300ms delay to allow token processing
            const maxRetries = 3;
            let retryCount = 0;

            while (retryCount < maxRetries) {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    console.log('✅ [ResetPasswordForm] Session found:', session.user.email);
                    setHasSession(true);
                    setCheckingSession(false);
                    return;
                }

                retryCount++;
                if (retryCount < maxRetries) {
                    console.log(`🔄 [ResetPasswordForm] No session yet, retrying... (${retryCount}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            console.warn('⚠️ [ResetPasswordForm] No session found after retries');
            setHasSession(false);
            setCheckingSession(false);
        };

        checkSession();
    }, []);

    const onSubmit = async (data: FormData) => {
        console.log('🔐 [ResetPasswordForm] Form submitted');

        if (!hasSession) {
            console.error('❌ [ResetPasswordForm] Cannot submit - no active session');
            setError('No active session. Please click the password reset link again.');
            return;
        }

        try {
            setError('');
            setSuccess(false);

            console.log('🔐 [ResetPasswordForm] Calling authService.updatePassword...');
            await authService.updatePassword(data.newPassword);
            console.log('✅ [ResetPasswordForm] Password updated successfully');
            setSuccess(true);

            // Redirect to login or dashboard after successful password change
            setTimeout(() => {
                console.log('🔄 [ResetPasswordForm] Redirecting to dashboard');
                router.push('/dashboard');
            }, 1500);
        } catch (err: any) {
            console.error('❌ [ResetPasswordForm] Update failed:', err);
            setError(err?.message || 'Failed to update password');
        }
    };

    if (checkingSession) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Reset Password</CardTitle>
                    <CardDescription>
                        Verifying your recovery link...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasSession) {
        return (
            <Card className="w-full max-w-md border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-xl text-destructive">Invalid or Expired Link</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertDescription>
                            The password reset link is invalid or has expired. Please request a new password reset email.
                        </AlertDescription>
                    </Alert>
                    <Button asChild className="w-full">
                        <a href="/login">Return to Login</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>
                    Enter your new password below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-4 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                        <AlertDescription>Password updated successfully! Redirecting...</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder="••••••"
                            {...register('newPassword')}
                        />
                        {errors.newPassword && (
                            <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting || success}
                        className="w-full"
                    >
                        {isSubmitting ? 'Updating Password...' : 'Update Password'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
