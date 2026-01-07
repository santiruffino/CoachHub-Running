'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function AcceptInvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const { register, handleSubmit, watch, formState: { errors } } = useForm();
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
            } catch (error: any) {
                console.error('Invalid token:', error);
                setInvitationValid(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const onSubmit = async (data: any) => {
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
        } catch (error: any) {
            console.error('Error accepting invitation:', error);
            setError(error.response?.data?.error || 'Failed to create account. Please try again.');
            setSubmitting(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            <p className="text-muted-foreground">Validando invitación...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!token || !invitationValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            <CardTitle>Invitación Inválida</CardTitle>
                        </div>
                        <CardDescription>
                            Este enlace de invitación es inválido o ha expirado.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            Ir al Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <CardTitle>¡Cuenta Creada!</CardTitle>
                        </div>
                        <CardDescription>
                            Tu cuenta ha sido creada exitosamente. Redirigiendo al login...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Aceptar Invitación</CardTitle>
                    <CardDescription>
                        Crea tu cuenta para comenzar a entrenar
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Email (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={invitationEmail}
                                disabled
                                className="bg-gray-50"
                            />
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Juan Pérez"
                                {...register('name', {
                                    required: 'El nombre es requerido',
                                    minLength: {
                                        value: 2,
                                        message: 'El nombre debe tener al menos 2 caracteres',
                                    },
                                })}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name.message as string}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                {...register('password', {
                                    required: 'La contraseña es requerida',
                                    minLength: {
                                        value: 6,
                                        message: 'La contraseña debe tener al menos 6 caracteres',
                                    },
                                })}
                            />
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password.message as string}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Repite tu contraseña"
                                {...register('confirmPassword', {
                                    required: 'Por favor confirma tu contraseña',
                                    validate: (value) =>
                                        value === password || 'Las contraseñas no coinciden',
                                })}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500">
                                    {errors.confirmPassword.message as string}
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando cuenta...
                                </>
                            ) : (
                                'Crear Cuenta'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            <p className="text-muted-foreground">Cargando...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        }>
            <AcceptInvitationContent />
        </Suspense>
    );
}
