'use client';

import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { useState } from 'react';

export default function BuilderTestPage() {
    const [jsonOutput, setJsonOutput] = useState('');

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Workout Builder MVP Test</h1>

            <WorkoutBuilder
                onChange={(blocks) => setJsonOutput(JSON.stringify(blocks, null, 2))}
            />

            <div className="mt-8">
                <h2 className="text-lg font-bold mb-2">JSON Output</h2>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
                    {jsonOutput}
                </pre>
            </div>
        </div>
    );
}
