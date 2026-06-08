'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import {
    teamInviteLinkService,
    type TeamInviteLinkResolution,
} from '@/features/invitations/services/team-invite-link.service';
import { CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { appLogger } from '@/lib/app-logger';

interface JoinFormData {
    email: string;
    name: string;
    password: string;
    confirmPassword: string;
}

interface ApiErrorResponse {
    error?: string;
    message?: string;
}

function JoinTeamContent() {
    const t = useTranslations('invitations.join');
    const router = useRouter();
    const params = useParams<{ token: string }>();
    const token = params?.token ?? '';
    const supabase = createClient();

    const [resolution, setResolution] = useState<TeamInviteLinkResolution | null>(null);
    const [resolving, setResolving] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<JoinFormData>();

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!token) {
                setResolving(false);
                return;
            }
            try {
                const res = await teamInviteLinkService.resolvePublic(token);
                if (!cancelled) setResolution(res);
            } catch (err) {
                appLogger.error('join.resolve_failed', err);
                if (!cancelled) {
                    setResolution({ valid: false, reason: 'not_found' });
                }
            } finally {
                if (!cancelled) setResolving(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const onSubmit = async (data: JoinFormData) => {
        setSubmitting(true);
        setError(null);

        try {
            await teamInviteLinkService.accept(token, {
                email: data.email.trim().toLowerCase(),
                name: data.name.trim(),
                password: data.password,
            });

            setSuccess(true);

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email.trim().toLowerCase(),
                password: data.password,
            });

            if (signInError) {
                appLogger.error('join.signin_failed', signInError);
                setTimeout(() => router.push('/login?message=account_created'), 1500);
                return;
            }

            setTimeout(() => router.push('/dashboard'), 1500);
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: ApiErrorResponse } })?.response?.data?.message ||
                (err as { response?: { data?: ApiErrorResponse } })?.response?.data?.error ||
                (err as Error)?.message ||
                t('loadError');
            appLogger.error('join.accept_failed', err);
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (resolving) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">{t('loading')}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!resolution || !resolution.valid) {
        const reason = resolution?.reason;
        let title = t('invalidTitle');
        let description = t('invalidDescription');
        if (reason === 'revoked') {
            title = t('revokedTitle');
            description = t('revokedDescription');
        } else if (reason === 'expired') {
            title = t('expiredTitle');
            description = t('expiredDescription');
        } else if (reason === 'max_uses_reached') {
            title = t('maxUsesTitle');
            description = t('maxUsesDescription');
        }
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <CardTitle>{title}</CardTitle>
                    </div>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/login')} className="w-full">
                        {t('goToLogin')}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (success) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                        <CheckCircle className="h-5 w-5" />
                        <CardTitle>{t('successTitle')}</CardTitle>
                    </div>
                    <CardDescription>{t('successDescription')}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const teamName = resolution.teamName || t('defaultTeamName');
    // v1: team invite links only create ATHLETE accounts.
    const roleLabel = t('roleAthlete');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2 text-endurix-orange">
                    <Users className="h-5 w-5" />
                    <CardTitle>{t('title', { team: teamName })}</CardTitle>
                </div>
                <CardDescription>
                    {t('subtitle', { role: roleLabel })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                    aria-label={t('formLabel')}
                >
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('emailPlaceholder')}
                            autoComplete="email"
                            {...register('email', {
                                required: t('emailRequired'),
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: t('emailInvalid'),
                                },
                            })}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message as string}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">{t('fullName')}</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder={t('fullNamePlaceholder')}
                            autoComplete="name"
                            {...register('name', {
                                required: t('nameRequired'),
                                minLength: { value: 2, message: t('nameMin') },
                            })}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message as string}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">{t('password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t('passwordPlaceholder')}
                            autoComplete="new-password"
                            {...register('password', {
                                required: t('passwordRequired'),
                                minLength: { value: 6, message: t('passwordMin') },
                            })}
                        />
                        {errors.password && (
                            <p className="text-sm text-destructive">{errors.password.message as string}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder={t('confirmPasswordPlaceholder')}
                            autoComplete="new-password"
                            {...register('confirmPassword', {
                                required: t('confirmPasswordRequired'),
                                validate: (value) =>
                                    value === watch('password') || t('passwordMismatch'),
                            })}
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-destructive">
                                {errors.confirmPassword.message as string}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={submitting}
                    >
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
    );
}

export default function JoinTeamPage() {
    return (
        <Suspense
            fallback={
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">{'Cargando...'}</p>
                        </div>
                    </CardContent>
                </Card>
            }
        >
            <JoinTeamContent />
        </Suspense>
    );
}
