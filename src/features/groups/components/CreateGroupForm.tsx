'use client';

import { useForm } from 'react-hook-form';
import { CreateGroupDto } from '../types';
import { groupsService } from '../services/groups.service';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function CreateGroupForm({ onSuccess }: { onSuccess?: () => void }) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateGroupDto>();
    const [error, setError] = useState('');

    const onSubmit = async (data: CreateGroupDto) => {
        try {
            await groupsService.create(data);
            reset();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError('Failed to create group');
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Create New Group</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Group Name</Label>
                        <Input
                            {...register('name', { required: 'Name is required' })}
                            placeholder="Marathon Training 2024"
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            {...register('description')}
                            placeholder="Optional description..."
                        />
                    </div>
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <Button type="submit">
                        Create Group
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
