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

const schema = z.object({
    email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
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
            setError(err?.message || 'Failed to send reset email');
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>
                    Enter your email address and we&apos;ll send you a link to reset your password.
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
                            Password reset email sent! Check your inbox for further instructions.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
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
                        {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-primary hover:underline">
                        Back to Login
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
