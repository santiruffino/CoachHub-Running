'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { TrainingType } from '@/features/trainings/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function CreateTrainingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const athleteId = searchParams.get('athleteId');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<TrainingType>(TrainingType.RUNNING);
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter a title for the training.');
            return;
        }

        if (blocks.length === 0) {
            setError('Please add at least one workout block.');
            return;
        }

        try {
            setIsSubmitting(true);
            await trainingsService.create({
                title,
                description,
                type,
                blocks
            });
            router.push('/trainings'); // Redirect to list
        } catch (err) {
            console.error('Failed to create training:', err);
            setError('Failed to create training. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        href="/trainings"
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Link>
                    <h1 className="text-2xl font-bold">Create New Training</h1>
                </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Details Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Training Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>
                                    Title <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., 5k Speed Intevals"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Sport Type</Label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as TrainingType)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {Object.values(TrainingType).map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional description..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Builder Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-medium">Workout Structure</h2>
                        {blocks.length === 0 && (
                            <Badge variant="outline" className="text-amber-600 bg-amber-50">
                                Add at least one block
                            </Badge>
                        )}
                    </div>

                    <WorkoutBuilder
                        initialBlocks={blocks}
                        onChange={setBlocks}
                        athleteId={athleteId || undefined}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="mr-4"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? 'Saving...' : 'Save Training'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
