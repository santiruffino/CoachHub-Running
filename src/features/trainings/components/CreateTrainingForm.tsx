'use client';

import { useForm } from 'react-hook-form';
import { CreateTrainingDto, TrainingType } from '../types';
import { trainingsService } from '../services/trainings.service';
import { useState } from 'react';

export function CreateTrainingForm({ onSuccess }: { onSuccess?: () => void }) {
    const { register, handleSubmit, reset } = useForm<CreateTrainingDto>();
    const [error, setError] = useState('');

    const onSubmit = async (data: CreateTrainingDto) => {
        try {
            // Parse blocks from JSON string if I were using a textarea, but for now assuming empty or basic
            // For MVP let's just send empty blocks or parse if it was a string field.
            // But type says 'any'.
            await trainingsService.create({ ...data, blocks: [] });
            reset();
            if (onSuccess) onSuccess();
        } catch (err) {
            setError('Failed to create training');
        }
    };

    return (
        <div className="bg-white p-6 shadow rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Training Template</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            {...register('title', { required: true })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm border p-2"
                            placeholder="Interval Run"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <select
                            {...register('type')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm border p-2 bg-white"
                        >
                            {Object.values(TrainingType).map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        {...register('description')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm border p-2"
                        placeholder="Details..."
                    />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-yellow-500"
                >
                    Create Template
                </button>
            </form>
        </div>
    );
}
