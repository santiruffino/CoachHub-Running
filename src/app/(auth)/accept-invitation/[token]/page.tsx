'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { invitationService } from '@/features/invitations/services/invitation.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type FormData = {
    name: string;
    password: string;
    confirmPassword: string;
};

type ErrorWithMessage = {
    message?: string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === 'object' && error !== null) {
        const withMessage = error as ErrorWithMessage;
        if (typeof withMessage.message === 'string' && withMessage.message.length > 0) {
            return withMessage.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

export default function AcceptInvitationPage() {
    const t = useTranslations('invitations.accept');
    const params = useParams();
    const token = params?.token as string;
    const [valid, setValid] = useState<boolean | null>(null);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const schema = z.object({
        name: z.string().min(2, t('nameMin')),
        password: z.string().min(6, t('passwordMin')),
        confirmPassword: z.string().min(6, t('passwordMin')),
    }).refine((data) => data.password === data.confirmPassword, {
        message: t('passwordMismatch'),
        path: ['confirmPassword'],
    });

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    useEffect(() => {
        if (token) {
            invitationService.validate(token)
                .then((res) => {
                    setValid(true);
                    setEmail(res.email);
                })
                .catch((err) => {
                    setValid(false);
                    setError(err.message);
                });
        }
    }, [token]);

    const onSubmit = async (data: FormData) => {
        try {
            setError('');

            // Accept invitation (creates user via API route)
            await invitationService.accept(token, {
                name: data.name,
                password: data.password,
            });

            setSuccess(true);

            // Now sign in the user with Supabase
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: data.password,
            });

            if (signInError) {
                setError(t('signInFailedAfterCreate'));
                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            // Redirect to password change page (since must_change_password is set)
            setTimeout(() => router.push('/change-password'), 1500);
        } catch (error: unknown) {
            setError(getErrorMessage(error, t('loadError')));
        }
    };

    if (valid === null) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <p className="text-center">{t('loading')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (valid === false) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error || t('invalidDescription')}
                            </AlertDescription>
                        </Alert>
                        <Button
                            className="w-full mt-4"
                            onClick={() => router.push('/login')}
                        >
                            {t('goToLogin')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">{t('title')}</CardTitle>
                    <CardDescription className="text-center">
                        {t('subtitle')}
                        <br />
                        {t('emailLabel')}: <strong>{email}</strong>
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
                            <AlertDescription>{t('successDescription')}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('fullName')}</Label>
                            <Input
                                id="name"
                                placeholder={t('fullNamePlaceholder')}
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{t('password')}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••"
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
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
                            {isSubmitting ? t('creatingAccount') : t('createAccount')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
