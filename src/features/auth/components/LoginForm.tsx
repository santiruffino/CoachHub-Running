'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { trackLoginSuccess } from '@/lib/analytics/events';
import { authService } from '../services/auth.service';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { useApiError } from '@/hooks/useApiError';

export default function LoginForm() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password');
    const { login, user, loading } = useAuth();
    const router = useRouter();
    const t = useTranslations('auth.login');
    const { translateError } = useApiError();

    const schema = z.object({
        email: z.string().email(t('emailInvalid')),
        password: loginMode === 'password' ? z.string().min(6, t('passwordTooShort')) : z.string().optional(),
    });

    type FormData = z.infer<typeof schema>;

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    const onSubmit = async (data: FormData) => {
        try {
            setError('');
            setSuccess('');
            
            if (loginMode === 'password') {
                await login(data.email, data.password!);
                trackLoginSuccess();
            } else {
                await authService.sendMagicLink(data.email);
                setSuccess(t('magicLinkSent'));
            }
        } catch (err: unknown) {
            setError(translateError(err));
        }
    };

    // While we're resolving auth or a redirect is pending, show a skeleton
    if (loading || user) {
        return (
            <Card className="w-full max-w-md border border-endurix-black/15 dark:border-border bg-endurix-paper dark:bg-card">
                <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                    <Skeleton className="h-8 w-32 mx-auto" />
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md border border-endurix-black/15 dark:border-border overflow-hidden bg-endurix-paper dark:bg-card">
            <div className="h-1 w-full bg-endurix-orange" />
            <CardHeader className="pt-8 border-b border-endurix-black/10 dark:border-border">
                <CardTitle className="text-3xl font-bold text-center tracking-tight uppercase" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
                {error && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 animate-in fade-in slide-in-from-top-1">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 animate-in fade-in slide-in-from-top-1">
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] uppercase font-bold tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('emailLabel')}
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-endurix-orange" />
                            <Input
                                id="email"
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                variant="boxed"
                                className="pl-10 h-11 bg-white dark:bg-card"
                                {...register('email')}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-xs text-destructive ml-1">{errors.email.message}</p>
                        )}
                    </div>

                    {loginMode === 'password' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label htmlFor="password" className="text-[10px] uppercase font-bold tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('passwordLabel')}
                            </Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-endurix-orange" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t('passwordPlaceholder')}
                                    variant="boxed"
                                    className="pl-10 h-11 bg-white dark:bg-card"
                                    {...register('password')}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive ml-1">{errors.password.message}</p>
                            )}
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="orange"
                        disabled={isSubmitting}
                        className="w-full h-11 uppercase tracking-widest text-xs"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('submittingButton')}</>
                        ) : (
                            loginMode === 'password' ? t('submitButton') : t('sendMagicLink')
                        )}
                    </Button>
                </form>

                <div className="space-y-3">
                    <Button
                        variant="ghost"
                        className="w-full text-[10px] uppercase tracking-widest font-bold text-endurix-black/50 dark:text-muted-foreground hover:text-endurix-orange hover:bg-endurix-orange/5 h-9"
                        onClick={() => {
                            setLoginMode(loginMode === 'password' ? 'magic' : 'password');
                            setError('');
                            setSuccess('');
                        }}
                    >
                        {loginMode === 'password' ? t('magicLink') : t('backToPassword')}
                    </Button>

                    {loginMode === 'password' && (
                        <div className="text-center">
                            <Link href="/forgot-password" className="text-xs font-medium text-endurix-black/50 dark:text-muted-foreground hover:text-endurix-orange transition-colors uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('forgotPassword')}
                            </Link>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
