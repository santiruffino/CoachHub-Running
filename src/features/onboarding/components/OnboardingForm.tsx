'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileService } from '@/features/profiles/services/profile.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
    SectionLayout,
    FieldGroup,
    FieldRow,
    Field,
    GenderToggle,
    underlineInput,
    disabledInput,
} from '@/components/layout/EditorialLayout';

export default function OnboardingForm() {
    const { user, loading: authLoading } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [selectedGender, setSelectedGender] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            dob: '',
            gender: '',
            height: '',
            weight: '',
        },
    });

    useEffect(() => {
        if (user) {
            setValue('firstName', user.firstName || '');
            setValue('lastName', user.lastName || '');
        }
    }, [user, setValue]);

    const handleGenderSelect = (value: string) => {
        setSelectedGender(value);
        setValue('gender', value, { shouldValidate: true });
    };

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        setError('');
        try {
            await profileService.updateProfile({
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                dob: data.dob,
                gender: data.gender,
                height: Number(data.height) || undefined,
                weight: Number(data.weight) || undefined,
                isOnboardingCompleted: true,
            });
            window.location.href = '/dashboard';
        } catch (err: any) {
            console.error('Onboarding save error:', err);
            setError(
                err?.response?.data?.message ||
                    'Ocurrió un error al guardar tu perfil. Intenta de nuevo.'
            );
            setSubmitting(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="w-full max-w-4xl mx-auto px-6 py-12 space-y-10">
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-5 w-80" />
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-2/3" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 overflow-y-auto pb-28">
                <div className="max-w-4xl mx-auto px-6 md:px-10 pt-12">
                    {/* Page header */}
                    <div className="mb-6">
                        <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-3">
                            PERFIL
                        </p>
                        <h1 className="text-3xl md:text-4xl font-display font-light text-foreground mb-2">
                            Configura tu cuenta
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Completa tu información personal. Estos datos servirán de base para
                            personalizar tus métricas y planes de entrenamiento.
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} id="onboarding-form">
                        {/* ── Section 1: Basic Identity ── */}
                        <SectionLayout
                            tag="IDENTIDAD"
                            title="Identificación básica"
                            description="Datos de contacto e identificación personal para tu perfil."
                        >
                            <FieldGroup>
                                <FieldRow>
                                    <Field label="NOMBRE" error={errors.firstName?.message as string}>
                                        <Input
                                            id="firstName"
                                            placeholder="ej. Marcos"
                                            className={underlineInput}
                                            {...register('firstName', { required: 'El nombre es obligatorio' })}
                                        />
                                    </Field>
                                    <Field label="APELLIDO" error={errors.lastName?.message as string}>
                                        <Input
                                            id="lastName"
                                            placeholder="ej. Alfaro"
                                            className={underlineInput}
                                            {...register('lastName', { required: 'El apellido es obligatorio' })}
                                        />
                                    </Field>
                                </FieldRow>

                                <Field label="CORREO ELECTRÓNICO">
                                    <Input
                                        id="email"
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className={disabledInput}
                                    />
                                </Field>

                                <Field label="TELÉFONO" error={errors.phone?.message as string}>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        className={underlineInput}
                                        {...register('phone', { required: 'El teléfono es obligatorio' })}
                                    />
                                </Field>
                            </FieldGroup>
                        </SectionLayout>

                        {/* ── Section 2: Physical Profile ── */}
                        <SectionLayout
                            tag="PERFIL FÍSICO"
                            title="Datos fisiológicos"
                            description="Necesarios para calcular zonas de intensidad y cargas metabólicas."
                        >
                            <FieldGroup>
                                <Field label="FECHA DE NACIMIENTO" error={errors.dob?.message as string}>
                                    <Input
                                        id="dob"
                                        type="date"
                                        className={underlineInput}
                                        {...register('dob', { required: 'La fecha de nacimiento es obligatoria' })}
                                    />
                                </Field>

                                <Field label="GÉNERO" error={errors.gender?.message as string}>
                                    <GenderToggle selected={selectedGender} onChange={handleGenderSelect} />
                                    <input
                                        type="hidden"
                                        {...register('gender', { required: 'El género es obligatorio' })}
                                    />
                                </Field>

                                <FieldRow>
                                    <Field label="ALTURA (CM)" error={errors.height?.message as string}>
                                        <Input
                                            id="height"
                                            type="number"
                                            placeholder="175"
                                            className={underlineInput}
                                            {...register('height', {
                                                required: 'La altura es obligatoria',
                                                min: { value: 50, message: 'Mínimo 50 cm' },
                                                max: { value: 250, message: 'Máximo 250 cm' },
                                            })}
                                        />
                                    </Field>
                                    <Field label="PESO (KG)" error={errors.weight?.message as string}>
                                        <Input
                                            id="weight"
                                            type="number"
                                            step="0.1"
                                            placeholder="70.0"
                                            className={underlineInput}
                                            {...register('weight', {
                                                required: 'El peso es obligatorio',
                                                min: { value: 20, message: 'Mínimo 20 kg' },
                                                max: { value: 300, message: 'Máximo 300 kg' },
                                            })}
                                        />
                                    </Field>
                                </FieldRow>
                            </FieldGroup>
                        </SectionLayout>
                    </form>
                </div>
            </div>

            {/* ── Sticky bottom action bar ── */}
            <div className="fixed bottom-0 inset-x-0 bg-background/80 backdrop-blur-md border-t border-border/20 z-50">
                <div className="max-w-4xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        Toda la información puede editarse más adelante desde tu perfil.
                    </p>
                    <Button
                        type="submit"
                        form="onboarding-form"
                        disabled={submitting}
                        className="ml-auto h-10 px-8 rounded-full font-medium text-sm"
                    >
                        {submitting ? 'Guardando...' : 'Completar perfil'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
