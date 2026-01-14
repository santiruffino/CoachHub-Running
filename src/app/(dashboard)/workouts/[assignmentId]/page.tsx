'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, User, Calendar, Activity } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import api from '@/lib/axios';

interface WorkoutAssignment {
    id: string;
    scheduledDate: string;
    completed: boolean;
    expectedRpe: number;
    training: {
        id: string;
        title: string;
        description: string;
        type: string;
        blocks: WorkoutBlock[];
    };
    athlete: {
        id: string;
        name: string;
        email: string;
    };
    canEdit: boolean;
}

export default function WorkoutDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const assignmentId = params.assignmentId as string;

    const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editedBlocks, setEditedBlocks] = useState<WorkoutBlock[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAssignment = async () => {
            try {
                setLoading(true);
                const response = await api.get<WorkoutAssignment>(`/v2/trainings/assignments/${assignmentId}`);
                console.log('WorkoutDetails: Full assignment:', response.data);
                console.log('WorkoutDetails: Athlete object:', response.data.athlete);
                console.log('WorkoutDetails: Athlete ID:', response.data.athlete?.id);
                setAssignment(response.data);
                setEditedBlocks(response.data.training.blocks || []);
            } catch (err: any) {
                console.error('Failed to fetch assignment:', err);
                setError(err.response?.data?.error || 'Failed to load workout');
            } finally {
                setLoading(false);
            }
        };

        if (assignmentId) {
            fetchAssignment();
        }
    }, [assignmentId]);

    const handleBlocksChange = (blocks: WorkoutBlock[]) => {
        setEditedBlocks(blocks);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!assignment || !hasChanges) return;

        try {
            setSaving(true);
            setError('');

            await api.patch(`/v2/trainings/assignments/${assignmentId}`, {
                blocks: editedBlocks,
            });

            // Refresh assignment data
            const response = await api.get<WorkoutAssignment>(`/v2/trainings/assignments/${assignmentId}`);
            setAssignment(response.data);
            setEditedBlocks(response.data.training.blocks || []);
            setHasChanges(false);

            alert('Workout updated successfully!');
        } catch (err: any) {
            console.error('Failed to save workout:', err);
            setError(err.response?.data?.error || 'Failed to save workout');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading workout...</p>
                </div>
            </div>
        );
    }

    if (error && !assignment) {
        return (
            <div className="p-8">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-red-200 dark:border-red-800">
                        <CardContent className="p-6">
                            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                                className="mt-4"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Go Back
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!assignment) return null;

    const isCoach = user?.role === 'COACH';
    const readOnly = !assignment.canEdit;

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>

                {assignment.canEdit && (
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                )}
            </div>

            {/* Workout Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">{assignment.training.title}</CardTitle>
                        {assignment.completed && (
                            <Badge variant="default" className="bg-green-600">
                                Completed
                            </Badge>
                        )}
                        {!assignment.completed && (
                            <Badge variant="secondary">
                                Planned
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Scheduled Date</p>
                                <p className="font-medium">
                                    {format(new Date(assignment.scheduledDate), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>

                        {isCoach && (
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Athlete</p>
                                    <p className="font-medium">{assignment.athlete.name || assignment.athlete.email}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Expected Effort (RPE)</p>
                                <p className="font-medium">{assignment.expectedRpe}/10</p>
                            </div>
                        </div>
                    </div>

                    {assignment.training.description && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">{assignment.training.description}</p>
                        </div>
                    )}

                    {readOnly && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                📖 You are viewing this workout in read-only mode
                            </p>
                        </div>
                    )}

                    {hasChanges && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                ⚠️ You have unsaved changes
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Workout Builder */}
            <Card>
                <CardHeader>
                    <CardTitle>Workout Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden min-h-[500px]">
                        <WorkoutBuilder
                            initialBlocks={editedBlocks}
                            onChange={readOnly ? undefined : handleBlocksChange}
                            athleteId={assignment.athlete.id}
                            readOnly={readOnly}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
