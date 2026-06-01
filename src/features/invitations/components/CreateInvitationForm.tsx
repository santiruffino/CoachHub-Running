'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { invitationService } from '../services/invitation.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

export function CreateInvitationForm() {
    const t = useTranslations('invitations.createForm');
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string }>();
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (data: { email: string }) => {
        setSuccess(null);
        setError(null);
        try {
            const res = await invitationService.create(data.email);
            const invitationUrl = `${window.location.origin}/accept-invitation?token=${res.token}`;
            setSuccess(t('success', { email: res.email, link: invitationUrl }));
            reset();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || t('error'));
                return;
            }

            setError(t('error'));
        }
    };

    return (
        <Card className="max-w-md bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
            <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('email')}</Label>
                        <Input
                            {...register('email', { required: t('emailRequired') })}
                            type="email"
                            id="email"
                            placeholder={t('emailPlaceholder')}
                            variant="boxed"
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>

                    <Button type="submit" variant="orange" className="w-full uppercase tracking-widest text-xs">
                        {t('send')}
                    </Button>

                    {success && (
                        <Alert className="bg-emerald-500/10 border-emerald-500/30">
                            <AlertDescription className="text-emerald-700 dark:text-emerald-400">{success}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
