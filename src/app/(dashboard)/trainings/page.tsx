'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Plus, Users, Clock, MapPin, Trash2 } from 'lucide-react';
import { Training } from '@/features/trainings/types';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AssignTrainingModal } from '@/features/trainings/components/AssignTrainingModal';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';

export default function TrainingsPage() {
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const fetchTrainings = async () => {
        try {
            const res = await trainingsService.findAll();
            setTrainings(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainings();
    }, []);

    const calculateStats = (blocks: any[]) => {
        if (!Array.isArray(blocks)) return { dist: 0, time: 0, blockCount: 0 };
        const stats = blocks.reduce((acc, block) => {
            if (block.duration?.type === 'distance') {
                acc.dist += block.duration.value || 0;
                acc.time += (block.duration.value || 0) / 1000 * 5; // est 5:00 min/km
            } else if (block.duration?.type === 'time') {
                acc.time += (block.duration.value || 0) / 60; // seconds to min
            }
            return acc;
        }, { dist: 0, time: 0 });
        return { ...stats, blockCount: blocks.length };
    };

    const handleAssignClick = (trainingId: string) => {
        setSelectedTrainingId(trainingId);
        setIsAssignModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setSelectedTrainingId(null);
    };

    const handleDelete = async (trainingId: string, trainingTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${trainingTitle}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await trainingsService.delete(trainingId);
            // Refresh the list
            await fetchTrainings();
        } catch (error) {
            console.error('Failed to delete training:', error);
            showAlert('error', 'Failed to delete training. Please try again.');
        }
    };

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Training Templates</h1>
                <Button asChild>
                    <Link href="/trainings/new">
                        <Plus className="h-5 w-5 mr-2" />
                        Create Training
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {trainings.map((training) => {
                        const stats = calculateStats(training.blocks);
                        return (
                            <Card key={training.id} className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 bg-primary/10 p-2 rounded-full">
                                                <Calendar className="h-5 w-5 text-primary" />
                                            </div>
                                            <h3 className="ml-3 text-lg font-semibold">{training.title}</h3>
                                        </div>
                                        <Badge variant="secondary">{training.type}</Badge>
                                    </div>

                                    {training.description && (
                                        <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{training.description}</p>
                                    )}

                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span>{(stats.dist / 1000).toFixed(1)}km</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>~{Math.ceil(stats.time)}min</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            <span>{stats.blockCount} blocks</span>
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-primary text-primary hover:bg-primary hover:text-white"
                                            onClick={() => handleAssignClick(training.id)}
                                        >
                                            Assign to Athlete
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                            onClick={() => handleDelete(training.id, training.title)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {trainings.length === 0 && (
                        <p className="text-muted-foreground col-span-full text-center py-10">No training templates found.</p>
                    )}
                </div>
            )}

            {selectedTrainingId && (
                <AssignTrainingModal
                    trainingId={selectedTrainingId}
                    isOpen={isAssignModalOpen}
                    onClose={handleCloseModal}
                />
            )}

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
