'use client';
import { appLogger } from '@/lib/app-logger';

import { useState } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Training } from '@/interfaces/training';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AssignTrainingModal } from '@/features/trainings/components/AssignTrainingModal';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TrainingsListProps {
    initialTrainings: Training[];
}

export function TrainingsList({ initialTrainings }: TrainingsListProps) {
    const t = useTranslations('trainings');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const [trainings, setTrainings] = useState<Training[]>(initialTrainings);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

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
            setTrainings(prev => prev.filter(t => t.id !== pendingDelete.id));
        } catch (error) {
            appLogger.error('Failed to delete training:', error);
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
        <div className="container mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold text-endurix-black dark:text-foreground tracking-tight uppercase"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        {t('title')}
                    </h1>
                </div>
                <Link href="/workouts/builder">
                    <Button variant="orange" size="sm" className="sm:size-default uppercase tracking-widest">
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('createTraining')}</span>
                    </Button>
                </Link>
            </div>

            <div className="mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        variant="boxed"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={tCommon('search')}
                        className="pl-10 h-11"
                    />
                </div>
            </div>

            {filteredTrainings.length === 0 ? (
                <div className="text-center py-20 bg-endurix-black/5 dark:bg-white/5 border border-dashed border-endurix-black/15 dark:border-white/15">
                    <p className="text-muted-foreground">{t('noTrainings')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrainings.map((training) => (
                        <div
                            key={training.id}
                            className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-5 hover:border-endurix-orange/50 transition-colors group flex flex-col h-full"
                        >
                            <h3
                                className="text-lg font-medium text-endurix-black dark:text-foreground tracking-tight mb-2 group-hover:text-endurix-orange transition-colors uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {training.title}
                            </h3>
                            {training.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 flex-grow mb-6">
                                    {training.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-endurix-black/10 dark:border-border">
                                <span
                                    className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                >
                                    {t('blocks', { count: training.blocks?.length || 0 })}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:text-endurix-orange hover:bg-endurix-orange/5"
                                        onClick={() => router.push(`/workouts/builder?id=${training.id}`)}
                                        title={tCommon('edit')}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline-brand"
                                        size="sm"
                                        className="h-8 px-3 font-bold text-xs uppercase tracking-wider"
                                        onClick={() => handleAssignClick(training.id)}
                                    >
                                        {t('assignToAthlete')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                                        onClick={() => handleDelete(training.id, training.title)}
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
