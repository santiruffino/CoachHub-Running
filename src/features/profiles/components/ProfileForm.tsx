'use client';

import { useForm } from 'react-hook-form';
import { UpdateProfileDto, ProfileDetails } from '../types';
import { profileService } from '../services/profile.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';
import { useForm as useHookForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VAM_LEVELS } from '../constants/vam';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    SectionLayout,
    FieldGroup,
    FieldRow,
    Field,
    GenderToggle,
    underlineInput,
    disabledInput,
} from '@/components/layout/EditorialLayout';

// ── Change Password sub-form ─────────────────────────────────────────────────
function ChangePasswordSection() {
    const { register, handleSubmit, reset, formState: { errors } } = useHookForm();
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const onSubmit = async (data: any) => {
        setMsg('');
        setErr('');
        if (data.newPassword !== data.confirmPassword) {
            setErr("Las contraseñas no coinciden");
            return;
        }
        try {
            await profileService.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            setMsg('Contraseña actualizada correctamente');
            reset();
        } catch {
            setErr('Error al cambiar la contraseña. Verifica la contraseña actual.');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldRow>
                <Field label="CONTRASEÑA ACTUAL" error={errors.currentPassword ? 'Requerido' : ''}>
                    <Input
                        type="password"
                        className={underlineInput}
                        {...register('currentPassword', { required: true })}
                    />
                </Field>
                <Field label="NUEVA CONTRASEÑA" error={errors.newPassword ? 'Mínimo 6 caracteres' : ''}>
                    <Input
                        type="password"
                        className={underlineInput}
                        {...register('newPassword', { required: true, minLength: 6 })}
                    />
                </Field>
            </FieldRow>
            <Field label="CONFIRMAR CONTRASEÑA">
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
                Actualizar contraseña
            </Button>
        </form>
    );
}

// ── Main ProfileForm ─────────────────────────────────────────────────────────
export function ProfileForm({ profile }: { profile: ProfileDetails }) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [selectedGender, setSelectedGender] = useState<string>((user as any)?.gender || '');

    const { register, handleSubmit, setValue } = useForm<UpdateProfileDto>({
        defaultValues: {
            firstName: (user as any)?.firstName,
            lastName: (user as any)?.lastName,
            phone: (user as any)?.phone,
            gender: (user as any)?.gender,
            bio: profile.coachProfile?.bio,
            specialty: profile.coachProfile?.specialty,
            experience: profile.coachProfile?.experience,
            height: profile.athleteProfile?.height,
            weight: profile.athleteProfile?.weight,
            injuries: profile.athleteProfile?.injuries,
            restHR: (profile.athleteProfile as any)?.restHR || (profile.athleteProfile as any)?.rest_hr,
            maxHR: (profile.athleteProfile as any)?.maxHR || (profile.athleteProfile as any)?.max_hr,
            vam: (profile.athleteProfile as any)?.vam,
            uan: (profile.athleteProfile as any)?.uan,
            dob: (profile.athleteProfile as any)?.dob,
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
        } catch (e: any) {
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
                        Perfil actualizado correctamente.
                    </AlertDescription>
                </Alert>
            )}
            {message === 'error' && (
                <Alert variant="destructive" className="mb-6 bg-destructive/10 border-destructive/20">
                    <AlertDescription>Error al actualizar el perfil. Intenta de nuevo.</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} id="profile-form">

                {/* ── Section 1: Basic Identity (all roles) ── */}
                <SectionLayout
                    tag="IDENTIDAD"
                    title="Identificación básica"
                    description="Datos de contacto e identificación personal de tu cuenta."
                >
                    <FieldGroup>
                        <FieldRow>
                            <Field label="NOMBRE">
                                <Input
                                    placeholder="ej. Marcos"
                                    className={underlineInput}
                                    {...register('firstName')}
                                />
                            </Field>
                            <Field label="APELLIDO">
                                <Input
                                    placeholder="ej. Alfaro"
                                    className={underlineInput}
                                    {...register('lastName')}
                                />
                            </Field>
                        </FieldRow>

                        <Field label="CORREO ELECTRÓNICO">
                            <Input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className={disabledInput}
                            />
                        </Field>

                        <FieldRow>
                            <Field label="TELÉFONO">
                                <Input
                                    type="tel"
                                    placeholder="+1 (555) 000-0000"
                                    className={underlineInput}
                                    {...register('phone')}
                                />
                            </Field>
                            <Field label="GÉNERO">
                                <GenderToggle selected={selectedGender} onChange={handleGenderSelect} />
                                <input type="hidden" {...register('gender')} />
                            </Field>
                        </FieldRow>
                    </FieldGroup>
                </SectionLayout>

                {/* ── Section 2a: Athlete Physical Profile ── */}
                {isAthlete && (
                    <SectionLayout
                        tag="PERFIL FÍSICO"
                        title="Datos fisiológicos"
                        description="Necesarios para calcular zonas de intensidad y cargas metabólicas."
                    >
                        <FieldGroup>
                            <FieldRow>
                                <Field label="FECHA DE NACIMIENTO">
                                    <Input
                                        type="date"
                                        className={underlineInput}
                                        {...register('dob')}
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="ALTURA (CM)">
                                        <Input
                                            type="number"
                                            placeholder="175"
                                            className={underlineInput}
                                            {...register('height')}
                                        />
                                    </Field>
                                    <Field label="PESO (KG)">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="70"
                                            className={underlineInput}
                                            {...register('weight')}
                                        />
                                    </Field>
                                </div>
                            </FieldRow>

                            <FieldRow>
                                <Field label="FC REPOSO (BPM)">
                                    <Input
                                        type="number"
                                        placeholder="55"
                                        className={underlineInput}
                                        {...register('restHR')}
                                    />
                                </Field>
                                <Field label="FC MÁXIMA (BPM)">
                                    <Input
                                        type="number"
                                        placeholder="190"
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
                        tag="RENDIMIENTO"
                        title="Historial de rendimiento"
                        description="Tests de umbral VAM y UAN. Al actualizar se guardará un registro histórico."
                    >
                        <FieldGroup>
                            <FieldRow>
                                <Field label="TEST VAM (mm:ss)" hint="Actualizar guarda historial.">
                                    <div className="flex gap-2 items-end">
                                        <Input
                                            type="text"
                                            placeholder="00:00"
                                            className={`${underlineInput} flex-1`}
                                            {...register('vam')}
                                        />
                                        <Select onValueChange={(value) => {
                                            const filtered = VAM_LEVELS.find(l => l.id === value);
                                            if (filtered) {
                                                const input = document.querySelector('input[name="vam"]') as HTMLInputElement;
                                                if (input) {
                                                    input.value = filtered.pace;
                                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                                }
                                            }
                                        }}>
                                            <SelectTrigger className="w-[110px] h-10 bg-background border-0 border-b border-border/40 rounded-none focus:ring-0 text-xs">
                                                <SelectValue placeholder="Preset" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {VAM_LEVELS.map(level => (
                                                    <SelectItem key={level.id} value={level.id}>
                                                        {level.name} ({level.pace})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Field>
                                <Field label="TEST UAN (mm:ss)" hint="Actualizar guarda historial.">
                                    <Input
                                        type="text"
                                        placeholder="00:00"
                                        className={underlineInput}
                                        {...register('uan')}
                                    />
                                </Field>
                            </FieldRow>

                            <Field label="LESIONES / NOTAS MÉDICAS">
                                <Textarea
                                    rows={3}
                                    placeholder="ej. Tendinitis rotuliana derecha (rehabilitación completada)"
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
                        tag="DATOS DE ENTRENADOR"
                        title="Perfil profesional"
                        description="Información que tus atletas verán en tu perfil de entrenador."
                    >
                        <FieldGroup>
                            <Field label="BIO">
                                <Textarea
                                    rows={4}
                                    placeholder="Cuéntanos sobre tu experiencia como entrenador..."
                                    className="bg-background border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground/50 resize-none text-sm"
                                    {...register('bio')}
                                />
                            </Field>
                            <FieldRow>
                                <Field label="ESPECIALIDAD">
                                    <Input
                                        placeholder="ej. Trail Running, Maratón"
                                        className={underlineInput}
                                        {...register('specialty')}
                                    />
                                </Field>
                                <Field label="EXPERIENCIA">
                                    <Input
                                        placeholder="ej. 8 años"
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
                tag="SEGURIDAD"
                title="Cambiar contraseña"
                description="Actualiza tu contraseña de acceso. Necesitarás tu contraseña actual."
            >
                <FieldGroup>
                    <ChangePasswordSection />
                </FieldGroup>
            </SectionLayout>

        </>
    );
}
