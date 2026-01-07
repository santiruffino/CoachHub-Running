'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { invitationService } from '../services/invitation.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CreateInvitationForm() {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string }>();
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (data: { email: string }) => {
        setSuccess(null);
        setError(null);
        try {
            const res = await invitationService.create(data.email);
            const invitationUrl = `${window.location.origin}/accept-invitation/${res.token}`;
            setSuccess(`Invitation sent to ${res.email}. Share this link: ${invitationUrl}`);
            reset();
        } catch (err: any) {
            setError(err.message || 'Failed to send invitation');
        }
    };

    return (
        <Card className="max-w-md">
            <CardHeader>
                <CardTitle>Invite Athlete</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            {...register('email', { required: 'Email is required' })}
                            type="email"
                            id="email"
                            placeholder="athlete@example.com"
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full">
                        Send Invitation
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
