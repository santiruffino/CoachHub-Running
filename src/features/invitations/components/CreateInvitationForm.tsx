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
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input
                            {...register('email', { required: t('emailRequired') })}
                            type="email"
                            id="email"
                            placeholder={t('emailPlaceholder')}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full">
                        {t('send')}
                    </Button>

                    {success && (
                        <Alert>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
