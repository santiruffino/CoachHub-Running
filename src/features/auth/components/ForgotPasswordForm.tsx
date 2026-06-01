'use client';
import { appLogger } from '@/lib/app-logger';


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../services/auth.service';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordForm() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const t = useTranslations('auth.forgotPassword');

    const schema = z.object({
        email: z.string().email(t('emailInvalid')),
    });

    type FormData = z.infer<typeof schema>;

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            setSuccess(false);

            await authService.resetPassword(data.email);
            setSuccess(true);
        } catch (err: unknown) {
            appLogger.error('❌ [ForgotPasswordForm] Failed to send reset email:', err);
            setError(isAxiosError(err) ? err.message : t('errorMessage'));
        }
    };

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
                        <AlertDescription>
                            {t('successMessage')}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('emailPlaceholder')}
                            variant="boxed"
                            {...register('email')}
                            disabled={success}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
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

                <div className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-[10px] uppercase tracking-widest text-endurix-black/60 dark:text-muted-foreground hover:text-endurix-orange transition-colors" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        {t('backToLogin')}
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
