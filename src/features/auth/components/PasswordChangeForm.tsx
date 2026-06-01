'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../services/auth.service';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isAxiosError } from 'axios';
import { useTranslations } from 'next-intl';

type FormData = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export default function PasswordChangeForm() {
    const t = useTranslations('profile.changePassword');

    const schema = z.object({
        currentPassword: z.string().min(6, t('tooShort')),
        newPassword: z.string().min(6, t('tooShort')),
        confirmPassword: z.string().min(6, t('tooShort')),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: t('mismatch'),
        path: ['confirmPassword'],
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    useAuth();
    const router = useRouter();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            setSuccess(false);

            await authService.updatePassword(data.newPassword);
            setSuccess(true);

            // Redirect to dashboard after successful password change
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (err: unknown) {
            setError(isAxiosError(err) ? err.message : t('error'));
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
                        <AlertDescription>{t('success')}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('currentPassword')}</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
                            variant="boxed"
                            {...register('currentPassword')}
                        />
                        {errors.currentPassword && (
                            <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('newPassword')}</Label>
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
                        <Label htmlFor="confirmPassword" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('confirmPassword')}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
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
                        {isSubmitting ? t('submit') + '...' : t('submit')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
