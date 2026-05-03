'use client';

import { useForm } from 'react-hook-form';
import { UpdateProfileDto, ProfileDetails } from '../types';
import { profileService } from '../services/profile.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';
import {
    useForm as useHookForm,
    UseFormRegister,
    UseFormSetValue,
    UseFormWatch,
} from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parsePaceToSeconds, formatSecondsToPace } from '../constants/vam';
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

type LegacyAthleteProfile = NonNullable<ProfileDetails['athleteProfile']> & {
    rest_hr?: number;
    max_hr?: number;
};

type TestSpeedInputProps = {
    formKey: 'vam' | 'uan';
    register: UseFormRegister<UpdateProfileDto>;
    setValue: UseFormSetValue<UpdateProfileDto>;
    watch: UseFormWatch<UpdateProfileDto>;
};

type ChangePasswordFormData = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

// ── Test Speed Input Component ───────────────────────────────────────────────
function TestSpeedInput({ formKey, register, setValue, watch }: TestSpeedInputProps) {
    const t = useTranslations('profile');
    const [dist, setDist] = useState('');
    const [timeStr, setTimeStr] = useState('');

    const currentPace = watch(formKey);

    const calculate = () => {
        const d = parseFloat(dist);
        if (isNaN(d) || d <= 0) return;
        const totalSecs = parsePaceToSeconds(timeStr);
        if (totalSecs <= 0) return;
        
        const paceSecs = totalSecs / d;
        setValue(formKey, formatSecondsToPace(paceSecs), { shouldDirty: true });
        setDist('');
        setTimeStr('');
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Calculator Panel */}
            <div className="flex flex-wrap items-center gap-3 bg-[#f8fafc] dark:bg-white/5 p-3 rounded border border-border/40">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground/70">{t('calculator.distancePlaceholder')}:</span>
                    <Input 
                        type="number" 
                        step="0.01" 
                        placeholder={t('testSpeed.distancePlaceholder')}
                        value={dist}
                        onChange={(e) => setDist(e.target.value)}
                        className="h-8 w-16 bg-background border-none px-2 text-xs"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground/70">{t('calculator.timePlaceholder')}:</span>
                    <Input 
                        type="text" 
                        placeholder={t('testSpeed.timePlaceholder')}
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                        className="h-8 w-20 bg-background border-none px-2 text-xs"
                    />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={calculate} className="h-8 text-xs ml-auto border-border/40">
                    {t('testSpeed.calculate')}
                </Button>
            </div>
            
            {/* Read-Only Current Pace */}
            <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold tracking-wider uppercase text-foreground/50">
                    {t('testSpeed.currentPaceLabel')}
                </span>
                <span className="text-sm font-bold text-[#4e6073] dark:text-[#f8f9fa]">
                    {currentPace ? `${currentPace} ${t('testSpeed.unit')}` : '-:--'}
                </span>
            </div>

            {/* Hidden internal state bound to form builder */}
            <input type="hidden" {...register(formKey)} />
        </div>
    );
}

// ── Change Password sub-form ─────────────────────────────────────────────────
function ChangePasswordSection() {
    const t = useTranslations('profile.changePassword');
    const { register, handleSubmit, reset, formState: { errors } } = useHookForm<ChangePasswordFormData>();
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const onSubmit = async (data: ChangePasswordFormData) => {
        setMsg('');
        setErr('');
        if (data.newPassword !== data.confirmPassword) {
            setErr(t('mismatch'));
            return;
        }
        try {
            await profileService.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            setMsg(t('success'));
            reset();
        } catch {
            setErr(t('error'));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldRow>
                <Field label={t('currentPassword')} error={errors.currentPassword ? t('required') : ''}>
                    <Input
                        type="password"
                        className={underlineInput}
                        {...register('currentPassword', { required: true })}
                    />
                </Field>
                <Field label={t('newPassword')} error={errors.newPassword ? t('tooShort') : ''}>
                    <Input
                        type="password"
                        className={underlineInput}
                        {...register('newPassword', { required: true, minLength: 6 })}
                    />
                </Field>
            </FieldRow>
            <Field label={t('confirmPassword')}>
                <Input
                    type="password"
                    className={underlineInput}
                    {...register('confirmPassword', { required: true })}
                />
            </Field>

            {msg && (
                <Alert className="bg-green-500/10 border-green-500/20">
                    <AlertDescription className="text-green-700 dark:text-green-400">{msg}</AlertDescription>
                </Alert>
            )}
            {err && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                    <AlertDescription>{err}</AlertDescription>
                </Alert>
            )}

            <Button type="submit" variant="outline" size="sm" className="rounded-full px-6">
                {t('submit')}
            </Button>
        </form>
    );
}

// ── Main ProfileForm ─────────────────────────────────────────────────────────
export function ProfileForm({ profile }: { profile: ProfileDetails }) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [selectedGender, setSelectedGender] = useState<string>(user?.gender || '');
    const t = useTranslations('profile');
    const tOnboarding = useTranslations('onboarding');
    const athleteProfile = profile.athleteProfile as LegacyAthleteProfile | undefined;

    const { register, handleSubmit, setValue, watch } = useForm<UpdateProfileDto>({
        defaultValues: {
            firstName: user?.firstName,
            lastName: user?.lastName,
            phone: user?.phone,
            gender: user?.gender,
            bio: profile.coachProfile?.bio,
            specialty: profile.coachProfile?.specialty,
            experience: profile.coachProfile?.experience,
            height: profile.athleteProfile?.height,
            weight: profile.athleteProfile?.weight,
            injuries: profile.athleteProfile?.injuries,
            restHR: athleteProfile?.restHR ?? athleteProfile?.rest_hr,
            maxHR: athleteProfile?.maxHR ?? athleteProfile?.max_hr,
            vam: athleteProfile?.vam,
            uan: athleteProfile?.uan,
            dob: athleteProfile?.dob,
        }
    });

    const handleGenderSelect = (value: string) => {
        setSelectedGender(value);
        setValue('gender', value);
    };

    const onSubmit = async (data: UpdateProfileDto) => {
        try {
            if (data.height) data.height = Number(data.height) || undefined;
            if (data.weight) data.weight = Number(data.weight) || undefined;
            if (data.restHR) data.restHR = Number(data.restHR) || undefined;
            if (data.maxHR) data.maxHR = Number(data.maxHR) || undefined;

            await profileService.updateProfile(data);
            setMessage('success');
        } catch (e: unknown) {
            console.error(e);
            setMessage('error');
        }
    };

    const isCoach = user?.role === 'COACH';
    const isAthlete = user?.role === 'ATHLETE';

    return (
        <>
            {message === 'success' && (
                <Alert className="mb-6 bg-green-500/10 border-green-500/20">
                    <AlertDescription className="text-green-700 dark:text-green-400">
                        {t('successUpdate')}
                    </AlertDescription>
                </Alert>
            )}
            {message === 'error' && (
                <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20">
                    <AlertDescription>{t('errorUpdate')}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} id="profile-form">

                {/* ── Section 1: Basic Identity (all roles) ── */}
                <SectionLayout
                    tag={t('sections.identity.tag')}
                    title={t('sections.identity.title')}
                    description={t('sections.identity.description')}
                >
                    <FieldGroup>
                        <FieldRow>
                            <Field label={tOnboarding('fields.firstName')}>
                                <Input
                                    placeholder={tOnboarding('fields.firstNamePlaceholder')}
                                    className={underlineInput}
                                    {...register('firstName')}
                                />
                            </Field>
                            <Field label={tOnboarding('fields.lastName')}>
                                <Input
                                    placeholder={tOnboarding('fields.lastNamePlaceholder')}
                                    className={underlineInput}
                                    {...register('lastName')}
                                />
                            </Field>
                        </FieldRow>

                        <Field label={tOnboarding('fields.email')}>
                            <Input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className={disabledInput}
                            />
                        </Field>

                        <FieldRow>
                            <Field label={tOnboarding('fields.phone')}>
                                <Input
                                    type="tel"
                                    placeholder={tOnboarding('fields.phonePlaceholder')}
                                    className={underlineInput}
                                    {...register('phone')}
                                />
                            </Field>
                            <Field label={tOnboarding('fields.gender')}>
                                <GenderToggle selected={selectedGender} onChange={handleGenderSelect} />
                                <input type="hidden" {...register('gender')} />
                            </Field>
                        </FieldRow>
                    </FieldGroup>
                </SectionLayout>

                {/* ── Section 2a: Athlete Physical Profile ── */}
                {isAthlete && (
                    <SectionLayout
                        tag={tOnboarding('sections.physical.tag')}
                        title={tOnboarding('sections.physical.title')}
                        description={tOnboarding('sections.physical.description')}
                    >
                        <FieldGroup>
                            <FieldRow>
                                <Field label={tOnboarding('fields.dob')}>
                                    <Input
                                        type="date"
                                        className={underlineInput}
                                        {...register('dob')}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label={tOnboarding('fields.height')}>
                                        <Input
                                            type="number"
                                            placeholder={tOnboarding('fields.heightPlaceholder')}
                                            className={underlineInput}
                                            {...register('height')}
                                        />
                                    </Field>
                                    <Field label={tOnboarding('fields.weight')}>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            placeholder={tOnboarding('fields.weightPlaceholder')}
                                            className={underlineInput}
                                            {...register('weight')}
                                        />
                                    </Field>
                                </div>
                            </FieldRow>

                            <FieldRow>
                                <Field label={t('fields.restHR')}>
                                    <Input
                                        type="number"
                                        placeholder={t('fields.restHRPlaceholder')}
                                        className={underlineInput}
                                        {...register('restHR')}
                                    />
                                </Field>
                                <Field label={t('fields.maxHR')}>
                                    <Input
                                        type="number"
                                        placeholder={t('fields.maxHRPlaceholder')}
                                        className={underlineInput}
                                        {...register('maxHR')}
                                    />
                                </Field>
                            </FieldRow>
                        </FieldGroup>
                    </SectionLayout>
                )}

                {/* ── Section 2b: Athlete Performance ── */}
                {isAthlete && (
                    <SectionLayout
                        tag={t('sections.performance.tag')}
                        title={t('sections.performance.title')}
                        description={t('sections.performance.description')}
                    >
                        <FieldGroup>
                            <FieldRow>
                                <Field label={t('fields.vam')} hint={t('sections.performance.vamHint')}>
                                    <TestSpeedInput 
                                        formKey="vam" 
                                        register={register} 
                                        setValue={setValue} 
                                        watch={watch} 
                                    />
                                </Field>
                                <Field label={t('fields.uan')} hint={t('sections.performance.uanHint')}>
                                    <TestSpeedInput 
                                        formKey="uan" 
                                        register={register} 
                                        setValue={setValue} 
                                        watch={watch} 
                                    />
                                </Field>
                            </FieldRow>

                            <Field label={t('fields.injuries')}>
                                <Textarea
                                    rows={3}
                                    placeholder={t('fields.injuriesPlaceholder')}
                                    className="bg-background border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground/50 resize-none text-sm"
                                    {...register('injuries')}
                                />
                            </Field>
                        </FieldGroup>
                    </SectionLayout>
                )}

                {/* ── Section 2c: Coach Profile ── */}
                {isCoach && (
                    <SectionLayout
                        tag={t('sections.coach.tag')}
                        title={t('sections.coach.title')}
                        description={t('sections.coach.description')}
                    >
                        <FieldGroup>
                            <Field label={t('fields.bio')}>
                                <Textarea
                                    rows={4}
                                    placeholder={t('fields.bioPlaceholder')}
                                    className="bg-background border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground/50 resize-none text-sm"
                                    {...register('bio')}
                                />
                            </Field>
                            <FieldRow>
                                <Field label={t('fields.specialty')}>
                                    <Input
                                        placeholder={t('fields.specialtyPlaceholder')}
                                        className={underlineInput}
                                        {...register('specialty')}
                                    />
                                </Field>
                                <Field label={t('fields.experience')}>
                                    <Input
                                        placeholder={t('fields.experiencePlaceholder')}
                                        className={underlineInput}
                                        {...register('experience')}
                                    />
                                </Field>
                            </FieldRow>
                        </FieldGroup>
                    </SectionLayout>
                )}

            </form>

            {/* ── Security (outside main form to avoid nested <form>) ── */}
            <SectionLayout
                tag={t('changePassword.tag')}
                title={t('changePassword.title')}
                description={t('changePassword.description')}
            >
                <FieldGroup>
                    <ChangePasswordSection />
                </FieldGroup>
            </SectionLayout>

        </>
    );
}
