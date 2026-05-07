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
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl">{t('title')}</CardTitle>
                <CardDescription>
                    {t('description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-4">
                        <AlertDescription>{t('success')}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
                            {...register('currentPassword')}
                        />
                        {errors.currentPassword && (
                            <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">{t('newPassword')}</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
                            {...register('newPassword')}
                        />
                        {errors.newPassword && (
                            <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
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
                        {isSubmitting ? t('submit') + '...' : t('submit')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
