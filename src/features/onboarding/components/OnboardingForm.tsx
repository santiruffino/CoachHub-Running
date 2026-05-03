'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
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
import { useTranslations } from 'next-intl';

interface OnboardingFormValues {
    firstName: string;
    lastName: string;
    phone: string;
    dob: string;
    gender: string;
    height: string;
    weight: string;
}

export default function OnboardingForm() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [selectedGender, setSelectedGender] = useState('');
    const t = useTranslations('onboarding');

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<OnboardingFormValues>({
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

    const onSubmit = async (data: OnboardingFormValues) => {
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
            router.replace('/dashboard');
        } catch (err: unknown) {
            console.error('Onboarding save error:', err);
            if (isAxiosError(err) && err.response && typeof err.response.data === 'object' && err.response.data !== null) {
                const responseData = err.response.data as { message?: string };
                setError(responseData.message || t('errorSave'));
            } else {
                setError(t('errorSave'));
            }
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
                            {t('tag')}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-display font-light text-foreground mb-2">
                            {t('title')}
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-md">
                            {t('subtitle')}
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
                            tag={t('sections.identity.tag')}
                            title={t('sections.identity.title')}
                            description={t('sections.identity.description')}
                        >
                            <FieldGroup>
                                <FieldRow>
                                    <Field label={t('fields.firstName')} error={errors.firstName?.message as string}>
                                        <Input
                                            id="firstName"
                                            placeholder={t('fields.firstNamePlaceholder')}
                                            className={underlineInput}
                                            {...register('firstName', { required: t('fields.firstNameRequired') })}
                                        />
                                    </Field>
                                    <Field label={t('fields.lastName')} error={errors.lastName?.message as string}>
                                        <Input
                                            id="lastName"
                                            placeholder={t('fields.lastNamePlaceholder')}
                                            className={underlineInput}
                                            {...register('lastName', { required: t('fields.lastNameRequired') })}
                                        />
                                    </Field>
                                </FieldRow>

                                <Field label={t('fields.email')}>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className={disabledInput}
                                    />
                                </Field>

                                <Field label={t('fields.phone')} error={errors.phone?.message as string}>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder={t('fields.phonePlaceholder')}
                                        className={underlineInput}
                                        {...register('phone', { required: t('fields.phoneRequired') })}
                                    />
                                </Field>
                            </FieldGroup>
                        </SectionLayout>

                        {/* ── Section 2: Physical Profile ── */}
                        <SectionLayout
                            tag={t('sections.physical.tag')}
                            title={t('sections.physical.title')}
                            description={t('sections.physical.description')}
                        >
                            <FieldGroup>
                                <Field label={t('fields.dob')} error={errors.dob?.message as string}>
                                    <Input
                                        id="dob"
                                        type="date"
                                        className={underlineInput}
                                        {...register('dob', { required: t('fields.dobRequired') })}
                                    />
                                </Field>

                                <Field label={t('fields.gender')} error={errors.gender?.message as string}>
                                    <GenderToggle selected={selectedGender} onChange={handleGenderSelect} />
                                    <input
                                        type="hidden"
                                        {...register('gender', { required: t('fields.genderRequired') })}
                                    />
                                </Field>

                                <FieldRow>
                                    <Field label={t('fields.height')} error={errors.height?.message as string}>
                                        <Input
                                            id="height"
                                            type="number"
                                            placeholder={t('fields.heightPlaceholder')}
                                            className={underlineInput}
                                            {...register('height', {
                                                required: t('fields.heightRequired'),
                                                min: { value: 50, message: t('fields.heightMin') },
                                                max: { value: 250, message: t('fields.heightMax') },
                                            })}
                                        />
                                    </Field>
                                    <Field label={t('fields.weight')} error={errors.weight?.message as string}>
                                        <Input
                                            id="weight"
                                            type="number"
                                            step="0.1"
                                            placeholder={t('fields.weightPlaceholder')}
                                            className={underlineInput}
                                            {...register('weight', {
                                                required: t('fields.weightRequired'),
                                                min: { value: 20, message: t('fields.weightMin') },
                                                max: { value: 300, message: t('fields.weightMax') },
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
                        {t('footer')}
                    </p>
                    <Button
                        type="submit"
                        form="onboarding-form"
                        disabled={submitting}
                        className="ml-auto h-10 px-8 rounded-full font-medium text-sm"
                    >
                        {submitting ? t('submitting') : t('submit')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
