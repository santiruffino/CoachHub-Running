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

const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function AcceptInvitationPage() {
    const params = useParams();
    const token = params?.token as string;
    const [valid, setValid] = useState<boolean | null>(null);
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

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
                setError('Account created but login failed. Please try logging in manually.');
                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            // Redirect to password change page (since must_change_password is set)
            setTimeout(() => router.push('/change-password'), 1500);
        } catch (err: any) {
            setError(err?.message || 'Registration failed. Please try again.');
        }
    };

    if (valid === null) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <p className="text-center">Validating invitation...</p>
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
                                {error || 'Invalid or expired invitation.'}
                            </AlertDescription>
                        </Alert>
                        <Button
                            className="w-full mt-4"
                            onClick={() => router.push('/login')}
                        >
                            Go to Login
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
                    <CardTitle className="text-2xl text-center">Join Coach Hub</CardTitle>
                    <CardDescription className="text-center">
                        You have been invited as an Athlete
                        <br />
                        Email: <strong>{email}</strong>
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
                            <AlertDescription>
                                Account created successfully! Redirecting...
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Set Password</Label>
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
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                            {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
