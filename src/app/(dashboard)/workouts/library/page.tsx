'use client';

import { useState, useEffect } from 'react';
import { Training } from '@/features/trainings/types';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function WorkoutLibraryPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Training[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await api.delete(`/v2/trainings/${id}`);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Failed to delete template:', error);
            alert('Failed to delete template');
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workout Library</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your workout templates</p>
                </div>
                <Link href="/workouts/builder">
                    <Button className="bg-brand-primary hover:bg-brand-primary-dark text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {searchQuery ? 'No templates found matching your search.' : 'No templates yet.'}
                    </p>
                    {!searchQuery && (
                        <Link href="/workouts/builder">
                            <Button className="bg-brand-primary hover:bg-brand-primary-dark text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Template
                            </Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                        {template.title}
                                    </h3>
                                    {template.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {template.blocks?.length || 0} steps
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/workouts/assign?templateId=${template.id}`)}
                                    >
                                        Assign
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
