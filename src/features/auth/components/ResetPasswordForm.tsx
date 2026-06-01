'use client';
import { appLogger } from '@/lib/app-logger';


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../services/auth.service';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';

type FormData = {
    newPassword: string;
    confirmPassword: string;
};

export default function ResetPasswordForm() {
    const t = useTranslations('auth.resetPassword');

    const schema = z.object({
        newPassword: z.string().min(6, t('passwordTooShort')),
        confirmPassword: z.string().min(6, t('passwordTooShort')),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: t('passwordMismatch'),
        path: ['confirmPassword'],
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const router = useRouter();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        const checkSession = async () => {
            const supabase = createClient();

            // Retry up to 5 times with 500ms delay to allow session/auth state to stabilize
            // after redirection from the callback route.
            const maxRetries = 5;
            let retryCount = 0;

            while (retryCount < maxRetries) {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    setHasSession(true);
                    setCheckingSession(false);
                    return;
                }

                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            appLogger.warn('⚠️ [ResetPasswordForm] No session found after retries');
            setHasSession(false);
            setCheckingSession(false);
        };

        checkSession();
    }, []);

    const onSubmit = async (data: FormData) => {

        if (!hasSession) {
            appLogger.error('❌ [ResetPasswordForm] Cannot submit - no active session');
            setError(t('noSessionError'));
            return;
        }

        try {
            setError('');
            setSuccess(false);

            await authService.updatePassword(data.newPassword);
            setSuccess(true);

            // Redirect to login or dashboard after successful password change
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (err: unknown) {
            appLogger.error('❌ [ResetPasswordForm] Update failed:', err);
            setError(isAxiosError(err) ? err.message : t('errorMessage'));
        }
    };

    if (checkingSession) {
        return (
            <Card className="w-full max-w-md bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-border">
                <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                    <CardTitle className="text-2xl uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('title')}</CardTitle>
                    <CardDescription>
                        {t('verifyingLink')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-endurix-orange"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasSession) {
        return (
            <Card className="w-full max-w-md bg-endurix-paper dark:bg-card border border-red-500/30">
                <CardHeader className="border-b border-red-500/30">
                    <CardTitle className="text-xl text-red-600 dark:text-red-400 uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('invalidTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                        <AlertDescription>
                            {t('invalidDescription')}
                        </AlertDescription>
                    </Alert>
                    <Button asChild variant="outline-brand" className="w-full uppercase tracking-widest text-xs">
                        <a href="/login">{t('backToLogin')}</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-border">
            <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                <CardTitle className="text-2xl uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('title')}</CardTitle>
                <CardDescription>
                    {t('description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                {error && (
                    <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
                        <AlertDescription>{t('successMessage')}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('newPasswordLabel')}</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
                            variant="boxed"
                            {...register('newPassword')}
                        />
                        {errors.newPassword && (
                            <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('confirmPasswordLabel')}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder={t('confirmPasswordPlaceholder')}
                            variant="boxed"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        variant="orange"
                        disabled={isSubmitting || success}
                        className="w-full uppercase tracking-widest text-xs"
                    >
                        {isSubmitting ? t('submittingButton') : t('submitButton')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
