'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../services/auth.service';
import { useState } from 'react';
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
        } catch (err: any) {
            console.error('❌ [ForgotPasswordForm] Failed to send reset email:', err);
            setError(err?.message || t('errorMessage'));
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
                    <Alert className="mb-4 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
                        <AlertDescription>
                            {t('successMessage')}
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu@ejemplo.com"
                            {...register('email')}
                            disabled={success}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting || success}
                        className="w-full"
                    >
                        {isSubmitting ? t('submittingButton') : t('submitButton')}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-primary hover:underline">
                        {t('backToLogin')}
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
