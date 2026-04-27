'use client';

import { useState, useEffect } from 'react';
import { Training } from '@/interfaces/training';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';

export default function WorkoutLibraryPage() {
    const router = useRouter();
    const t = useTranslations('workouts.libraryPage');
    const [templates, setTemplates] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get<Training[]>('/v2/trainings');
            setTemplates(res.data.filter(t => t.isTemplate));
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('deleteConfirm'))) return;

        // Add to deleting set to disable button
        setDeletingIds(prev => new Set(prev).add(id));

        try {
            await api.delete(`/v2/trainings/${id}`);
            // Optimistically update the UI
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Failed to delete template:', error);
            showAlert('error', t('deleteError'));
        } finally {
            // Remove from deleting set
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const filteredTemplates = templates.filter(tmpl =>
        tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
                </div>
                <Link href="/workouts/builder">
                    <Button className="bg-brand-primary hover:bg-brand-primary-dark text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('createTemplate')}
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-card text-foreground focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('loadingTemplates')}</p>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                        {searchQuery ? t('noTemplatesSearch') : t('noTemplatesYet')}
                    </p>
                    {!searchQuery && (
                        <Link href="/workouts/builder">
                            <Button className="bg-brand-primary hover:bg-brand-primary-dark text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('createFirstTemplate')}
                            </Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold font-display tracking-tight text-foreground mb-1">
                                        {template.title}
                                    </h3>
                                    {template.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {template.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
                                        <span className="w-4 h-4 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[8px] font-bold uppercase">
                                            {template.coach?.name?.charAt(0) || 'C'}
                                        </span>
                                        {t('createdBy', { name: template.coach?.name || 'Team Coach' })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    {template.blocks?.length || 0} {t('steps')}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/workouts/builder?id=${template.id}`)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/workouts/assign?templateId=${template.id}`)}
                                    >
                                        {t('assign')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(template.id)}
                                        disabled={deletingIds.has(template.id)}
                                    >
                                        <Trash2 className={deletingIds.has(template.id) ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
