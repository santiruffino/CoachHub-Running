'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Training } from '@/interfaces/training';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { Button } from '@/components/ui/button';
import { AssignTrainingModal } from '@/features/trainings/components/AssignTrainingModal';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function TrainingsPage() {
    const t = useTranslations('trainings');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const fetchTrainings = async () => {
        try {
            const res = await trainingsService.findAll();
            setTrainings(res.data.filter(training => training.isTemplate));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainings();
    }, []);

    const handleAssignClick = (trainingId: string) => {
        setSelectedTrainingId(trainingId);
        setIsAssignModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAssignModalOpen(false);
        setSelectedTrainingId(null);
    };

    const handleDelete = (trainingId: string, trainingTitle: string) => {
        setPendingDelete({ id: trainingId, title: trainingTitle });
    };

    const doDelete = async () => {
        if (!pendingDelete) return;
        try {
            setIsDeleting(true);
            await trainingsService.delete(pendingDelete.id);
            // Optimistically update the UI instead of re-fetching
            setTrainings(prev => prev.filter(t => t.id !== pendingDelete.id));
        } catch (error) {
            console.error('Failed to delete training:', error);
            showAlert('error', t('deleteError'));
        } finally {
            setIsDeleting(false);
            setPendingDelete(null);
        }
    };

    const filteredTrainings = trainings.filter(training =>
        training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        training.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('title')}</h1>
                <Link href="/workouts/builder">
                    <Button>
                        <Plus className="h-5 w-5 mr-2" />
                        {t('createTraining')}
                    </Button>
                </Link>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={tCommon('search')}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-card text-foreground focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
            ) : filteredTrainings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('noTrainings')}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTrainings.map((training) => (
                        <div
                            key={training.id}
                            className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <h3 className="text-lg font-bold font-display tracking-tight text-foreground mb-1">
                                {training.title}
                            </h3>
                            {training.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {training.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    {t('blocks', { count: training.blocks?.length || 0 })}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/workouts/builder?id=${training.id}`)}
                                        title={tCommon('edit')}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAssignClick(training.id)}
                                    >
                                        {t('assignToAthlete')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(training.id, training.title)}
                                        className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
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
                open={alertState.open || pendingDelete !== null}
                onClose={() => { if (!isDeleting) { closeAlert(); setPendingDelete(null); } }}
                onConfirm={pendingDelete ? doDelete : undefined}
                type={pendingDelete ? 'warning' : alertState.type}
                title={pendingDelete ? t('deleteConfirmTitle') : alertState.title}
                message={pendingDelete ? t('deleteConfirm', { title: pendingDelete.title }) : alertState.message}
                confirmText={pendingDelete ? t('deleteConfirmButton') : alertState.confirmText}
                loading={isDeleting}
            />
        </div>
    );
}
