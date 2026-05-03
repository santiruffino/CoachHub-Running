'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { TrainingType } from '@/interfaces/training';
import { Save, History, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

function CreateTrainingForm() {
    const t = useTranslations('trainings.new');
    const router = useRouter();
    const searchParams = useSearchParams();
    const athleteId = searchParams.get('athleteId');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type] = useState<TrainingType>(TrainingType.RUNNING);
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError(t('errorNoTitle'));
            return;
        }

        if (blocks.length === 0) {
            setError(t('errorNoBlocks'));
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
            router.push('/trainings');
        } catch (err) {
            console.error('Failed to create training:', err);
            setError(t('errorCreate'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#f8f9fa] dark:bg-[#0a0f14] font-inter">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-6 bg-transparent">
                <div className="flex flex-col gap-1 w-full max-w-2xl">
                     <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Workout Title"
                        className="text-4xl font-display font-bold bg-transparent border-none outline-none focus:ring-0 p-0 text-[#2b3437] dark:text-[#f8f9fa] placeholder:text-gray-300"
                    />
                     <div className="flex items-center gap-2 text-sm text-[#4e6073] mt-2">
                        <span className="font-semibold text-[#8b9bb4]">Focus:</span>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Threshold Development • Cycling"
                            className="bg-transparent border-none outline-none focus:ring-0 p-0 m-0 w-full placeholder:text-muted-foreground font-medium text-[#4e6073] dark:text-[#8b9bb4]"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0 shrink-0">
                    <Button type="button" variant="outline" className="gap-2 bg-white text-[#4e6073] border-[#e1e5e8] hover:bg-gray-50 dark:bg-[#1a232c] dark:border-white/10 dark:text-[#8b9bb4] shadow-sm rounded-full px-6">
                        <History className="w-4 h-4" />
                        Version History
                    </Button>
                    <Button type="button" variant="outline" className="gap-2 bg-white text-[#4e6073] border-[#e1e5e8] hover:bg-gray-50 dark:bg-[#1a232c] dark:border-white/10 dark:text-[#8b9bb4] shadow-sm rounded-full px-6">
                        <Share2 className="w-4 h-4" />
                        Share with Athlete
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="gap-2 bg-[#4e6073] hover:bg-[#2b3437] text-white shadow-sm rounded-full px-6">
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Saving...' : 'Save Workout'}
                    </Button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-hidden">
                <WorkoutBuilder
                    initialBlocks={blocks}
                    onChange={setBlocks}
                    athleteId={athleteId || undefined}
                />
            </div>
            
            {error && (
                <div className="absolute bottom-4 right-4 z-50">
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
}

export default function CreateTrainingPage() {
    const tCommon = useTranslations('common');
    return (
        <Suspense fallback={<div className="p-8">{tCommon('loading')}</div>}>
            <CreateTrainingForm />
        </Suspense>
    );
}
