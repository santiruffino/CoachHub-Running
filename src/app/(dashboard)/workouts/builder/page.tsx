'use client';

import { useState } from 'react';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { TrainingType } from '@/features/trainings/types';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import Link from 'next/link';

export default function WorkoutBuilderPage() {
    const router = useRouter();
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [workoutTitle, setWorkoutTitle] = useState('');
    const [workoutDescription, setWorkoutDescription] = useState('');
    const [expectedRpe, setExpectedRpe] = useState<number>(5);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!workoutTitle.trim()) {
            alert('Please enter a workout title');
            return;
        }

        if (blocks.length === 0) {
            alert('Please add at least one workout block');
            return;
        }

        try {
            setSaving(true);
            await trainingsService.create({
                title: workoutTitle,
                type: TrainingType.RUNNING,
                description: workoutDescription,
                blocks: blocks,
                isTemplate: true,
                expectedRpe: expectedRpe
            });

            alert('Workout template saved successfully!');
            router.push('/workouts/library');
        } catch (error) {
            console.error('Failed to save workout:', error);
            alert('Failed to save workout template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/workouts/library">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Library
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workout Builder</h1>
                </div>

                {/* Workout Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Workout Title *
                        </label>
                        <input
                            type="text"
                            value={workoutTitle}
                            onChange={(e) => setWorkoutTitle(e.target.value)}
                            placeholder="e.g., Lactate Threshold Intervals: 4×2km"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                    </label>
                    <input
                        type="text"
                        value={workoutDescription}
                        onChange={(e) => setWorkoutDescription(e.target.value)}
                        placeholder="e.g., Track / Flat Road"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Global Expected RPE (Mandatory) *
                    </label>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex-1">
                            <Slider
                                value={[expectedRpe]}
                                min={1}
                                max={10}
                                step={1}
                                onValueChange={(val) => setExpectedRpe(val[0])}
                                className="flex-1"
                            />
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span>Easy (1-3)</span>
                                <span>Moderate (4-6)</span>
                                <span>Hard (7-8)</span>
                                <span>Max (9-10)</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xl font-bold text-brand-primary">
                            {expectedRpe}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mb-4">
                <Button
                    onClick={handleSave}
                    disabled={saving || !workoutTitle.trim() || blocks.length === 0}
                    className="bg-brand-primary hover:bg-brand-primary-dark text-white"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save as Template'}
                </Button>
            </div>

            {/* Workout Builder */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-hidden">
                <WorkoutBuilder
                    initialBlocks={blocks}
                    onChange={setBlocks}
                />
            </div>
        </div>
    );
}
