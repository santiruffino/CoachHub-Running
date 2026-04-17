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
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';

export default function WorkoutBuilderPage() {
    const router = useRouter();
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [workoutTitle, setWorkoutTitle] = useState('');
    const [workoutDescription, setWorkoutDescription] = useState('');
    const [expectedRpe, setExpectedRpe] = useState<number>(5);
    const [saving, setSaving] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const handleSave = async () => {
        if (!workoutTitle.trim()) {
            showAlert('warning', 'Please enter a workout title');
            return;
        }

        if (blocks.length === 0) {
            showAlert('warning', 'Please add at least one workout block');
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

            showAlert('success', 'Workout template saved successfully!');
            setTimeout(() => router.push('/workouts/library'), 1500);
        } catch (error) {
            console.error('Failed to save workout:', error);
            showAlert('error', 'Failed to save workout template');
        } finally {
            setSaving(false);
        }
    };

    const leftSidebarContent = (
        <div className="p-8 pb-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2">
                Editor Phase 01
            </h3>
            <h2 className="text-xl font-bold font-display text-foreground dark:text-background mb-8">
                Core Details
            </h2>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1 block">
                        Workout Title
                    </label>
                    <input
                        type="text"
                        value={workoutTitle}
                        onChange={(e) => setWorkoutTitle(e.target.value)}
                        placeholder="e.g. Threshold Development"
                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-foreground dark:text-background focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1 block">
                        Activity Type
                    </label>
                    <select className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-foreground dark:text-background focus:ring-0 focus:border-primary outline-none">
                        <option value="RUNNING">Running</option>
                        <option value="CYCLING">Cycling</option>
                        <option value="SWIMMING">Swimming</option>
                        <option value="STRENGTH">Strength</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1 block">
                        Coach Notes
                    </label>
                     <input
                        type="text"
                        value={workoutDescription}
                        onChange={(e) => setWorkoutDescription(e.target.value)}
                        placeholder="Targeting lactate threshold..."
                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-foreground dark:text-background focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                    />
                </div>

                 <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block flex items-between">
                        Expected RPE
                        <span className="ml-auto text-primary">{expectedRpe}/10</span>
                    </label>
                    <Slider
                        value={[expectedRpe]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(val) => setExpectedRpe(val[0])}
                        className="my-4"
                    />
                </div>
            </div>
        </div>
    );

    const footerContent = (
        <div className="w-full flex items-center justify-between mx-auto px-8 max-w-7xl">
            <div className="flex flex-col">
                 <span className="text-lg font-bold font-display">Ready to Publish?</span>
                 <span className="text-xs text-muted-foreground/60">Ensure all intervals are calibrated to your current metrics.</span>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="outline" className="border-primary/20 text-foreground bg-transparent hover:bg-white/10 hover:text-white uppercase tracking-wider text-xs font-semibold px-6 py-6" onClick={() => router.push('/workouts/library')}>
                    Cancel / Exit
                </Button>
                <Button 
                    onClick={handleSave}
                    disabled={saving || !workoutTitle.trim() || blocks.length === 0}
                    className="bg-white text-foreground hover:bg-background uppercase tracking-wider text-xs font-semibold px-8 py-6 rounded shadow-lg"
                >
                    {saving ? 'Saving...' : 'Finalize Workout'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8">
            <WorkoutBuilder
                initialBlocks={blocks}
                onChange={setBlocks}
                leftSidebarContent={leftSidebarContent}
                footerContent={footerContent}
            />

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </div>
    );
}
