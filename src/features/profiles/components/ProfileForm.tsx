'use client';

import { useForm } from 'react-hook-form';
import { UpdateProfileDto, ProfileDetails } from '../types';
import { profileService } from '../services/profile.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';
import { useForm as useHookForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

function ChangePasswordSection() {
    const { register, handleSubmit, reset, formState: { errors } } = useHookForm();
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    const onSubmit = async (data: any) => {
        setMsg('');
        setErr('');
        if (data.newPassword !== data.confirmPassword) {
            setErr("Passwords don't match");
            return;
        }
        try {
            await profileService.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            setMsg('Password changed successfully');
            reset();
        } catch (e: any) {
            setErr('Failed to change password. Check current password.');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                    type="password"
                    {...register('currentPassword', { required: true })}
                />
            </div>
            <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                    type="password"
                    {...register('newPassword', { required: true, minLength: 6 })}
                />
            </div>
            <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                    type="password"
                    {...register('confirmPassword', { required: true })}
                />
            </div>

            {msg && (
                <Alert>
                    <AlertDescription>{msg}</AlertDescription>
                </Alert>
            )}
            {err && (
                <Alert variant="destructive">
                    <AlertDescription>{err}</AlertDescription>
                </Alert>
            )}

            <Button type="submit" variant="secondary">
                Update Password
            </Button>
        </form>
    );
}

export function ProfileForm({ profile }: { profile: ProfileDetails }) {
    const { user } = useAuth();
    const { register, handleSubmit } = useForm<UpdateProfileDto>({
        defaultValues: {
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

    const [message, setMessage] = useState('');

    const onSubmit = async (data: UpdateProfileDto) => {
        try {
            // Only convert to number if value exists to avoid NaN or 0 overwriting existing data
            if (data.height) data.height = Number(data.height) || undefined;
            if (data.weight) data.weight = Number(data.weight) || undefined;
            if (data.restHR) data.restHR = Number(data.restHR) || undefined;
            if (data.maxHR) data.maxHR = Number(data.maxHR) || undefined;

            await profileService.updateProfile(data);
            setMessage('Profile updated successfully!');
            // clear error style if any
        } catch (e: any) {
            console.error(e);
            if (e.response && e.response.data && e.response.data.message) {
                const msgs = e.response.data.message;
                setMessage(Array.isArray(msgs) ? msgs.join('. ') : msgs);
            } else {
                setMessage('Failed to update profile');
            }
        }
    };

    const isCoach = user?.role === 'COACH';

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {isCoach ? (
                        <>
                            <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea {...register('bio')} rows={3} />
                            </div>
                            <div className="space-y-2">
                                <Label>Specialty</Label>
                                <Input {...register('specialty')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Experience</Label>
                                <Input {...register('experience')} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Height (cm)</Label>
                                    <Input type="number" step="0.1" {...register('height')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Weight (kg)</Label>
                                    <Input type="number" step="0.1" {...register('weight')} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Rest Heart Rate (bpm)</Label>
                                    <Input type="number" {...register('restHR')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Heart Rate (bpm)</Label>
                                    <Input type="number" {...register('maxHR')} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Test VAM (Time - hh:mm)</Label>
                                    <Input type="text" placeholder="00:00" {...register('vam')} />
                                    <span className="text-xs text-muted-foreground">Updating this saves to history.</span>
                                </div>
                                <div className="space-y-2">
                                    <Label>Test UAN (Time - hh:mm)</Label>
                                    <Input type="text" placeholder="00:00" {...register('uan')} />
                                    <span className="text-xs text-muted-foreground">Updating this saves to history.</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <Input type="date" {...register('dob')} />
                            </div>

                            <div className="space-y-2">
                                <Label>Injuries</Label>
                                <Textarea {...register('injuries')} rows={2} />
                            </div>
                        </>
                    )}

                    {message && (
                        <Alert variant={message.includes('success') ? 'default' : 'destructive'}>
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit">
                        Save Changes
                    </Button>
                </form>

                <Separator className="my-6" />
                <div>
                    <h4 className="text-md font-medium mb-4">Change Password</h4>
                    <ChangePasswordSection />
                </div>
            </CardContent>
        </Card>
    );
}
