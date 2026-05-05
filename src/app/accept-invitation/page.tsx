'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';

interface AcceptFormData {
    name: string;
    password: string;
    confirmPassword: string;
}

interface ApiErrorResponse {
    error?: string;
}

function AcceptInvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const t = useTranslations('invitations.accept');
    const { register, handleSubmit, watch, formState: { errors } } = useForm<AcceptFormData>();
    const [validating, setValidating] = useState(true);
    const [invitationValid, setInvitationValid] = useState(false);
    const [invitationEmail, setInvitationEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const password = watch('password');

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setValidating(false);
                return;
            }

            try {
                const response = await api.get(`/invitations/validate/${token}`);
                setInvitationValid(true);
                setInvitationEmail(response.data.email);
            } catch (error: unknown) {
                console.error('Invalid token:', error);
                setInvitationValid(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const onSubmit = async (data: AcceptFormData) => {
        setSubmitting(true);
        setError('');

        try {
            await api.post('/auth/accept-invitation', {
                token,
                name: data.name,
                password: data.password,
            });

            setSuccess(true);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push('/login?message=account_created');
            }, 2000);
        } catch (error: unknown) {
            console.error('Error accepting invitation:', error);
            const message = (error as AxiosError<ApiErrorResponse>)?.response?.data?.error;
            setError(message || t('loadError'));
            setSubmitting(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">{t('loading')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!token || !invitationValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <CardTitle>{t('invalidTitle')}</CardTitle>
                        </div>
                        <CardDescription>
                            {t('invalidDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            {t('goToLogin')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                            <CheckCircle className="h-5 w-5" />
                            <CardTitle>{t('successTitle')}</CardTitle>
                        </div>
                        <CardDescription>
                            {t('successDescription')}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>
                        {t('subtitle')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Email (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('emailLabel')}</Label>
                            <Input
                                id="email"
                                type="email"
                                value={invitationEmail}
                                disabled
                                className="bg-muted opacity-100"
                            />
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('fullName')}</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder={t('fullNamePlaceholder')}
                                {...register('name', {
                                    required: t('nameRequired'),
                                    minLength: {
                                        value: 2,
                                        message: t('nameMin'),
                                    },
                                })}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message as string}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('password')}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder={t('passwordPlaceholder')}
                                {...register('password', {
                                    required: t('passwordRequired'),
                                    minLength: {
                                        value: 6,
                                        message: t('passwordMin'),
                                    },
                                })}
                            />
                            {errors.password && (
                                <p className="text-sm text-destructive">{errors.password.message as string}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder={t('confirmPasswordPlaceholder')}
                                {...register('confirmPassword', {
                                    required: t('confirmPasswordRequired'),
                                    validate: (value) =>
                                        value === password || t('passwordMismatch'),
                                })}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-destructive">
                                    {errors.confirmPassword.message as string}
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <p className="text-sm text-destructive font-medium">{error}</p>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('creatingAccount')}
                                </>
                            ) : (
                                t('createAccount')
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AcceptInvitationPage() {
    const t = useTranslations('invitations.accept');

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">{t('suspenseLoading')}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        }>
            <AcceptInvitationContent />
        </Suspense>
    );
}
