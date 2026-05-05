'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarView } from '@/features/calendar/components/CalendarView';
import { StudentFilter } from '@/features/calendar/components/StudentFilter';
import api from '@/lib/axios';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';

import { TrainingAssignment } from '@/interfaces/training';
import { CalendarEvent } from '@/features/calendar/components/CalendarView';

interface GroupMemberResponse {
    athlete?: {
        id: string;
        name?: string;
        email?: string;
    };
}

interface GroupResponse {
    id: string;
    name: string;
    members?: GroupMemberResponse[];
}

interface EventDropArgs {
    event: CalendarEvent;
    start: Date | string;
}

export default function CalendarPage() {
    const router = useRouter();
    const t = useTranslations('calendar.page');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [students, setStudents] = useState<{ id: string, name: string }[]>([]);
    const [groups, setGroups] = useState<{ id: string, name: string }[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const { alertState, showAlert, closeAlert } = useAlertDialog();
    const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date }>({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
    });

    // Fetch students and groups
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/v2/groups');

                // Set Groups
                const groupsData = (response.data as GroupResponse[]).map((group) => ({ id: group.id, name: group.name }));
                setGroups(groupsData);

                // Set Students from Groups
                const allStudentsMap = new Map<string, string>();
                (response.data as GroupResponse[]).forEach((group) => {
                    group.members?.forEach((member) => {
                        if (member.athlete) {
                            allStudentsMap.set(
                                member.athlete.id,
                                member.athlete.name || member.athlete.email || 'Unknown'
                            );
                        }
                    });
                });

                const studentList = Array.from(allStudentsMap.entries()).map(([id, name]) => ({ id, name }));
                setStudents(studentList);

                // Select all by default
                setSelectedStudentIds(studentList.map(s => s.id));
                setSelectedGroupIds(groupsData.map((group) => group.id));
            } catch (error) {
                console.error('Failed to fetch data', error);
            }
        };
        fetchData();
    }, []);

    const fetchAssignments = useCallback(async () => {
        if (selectedStudentIds.length === 0 && selectedGroupIds.length === 0) {
            setEvents([]);
            return;
        }

        try {
            const response = await api.get('/v2/trainings/calendar', {
                params: {
                    startDate: currentRange.start.toISOString(),
                    endDate: currentRange.end.toISOString(),
                    studentIds: selectedStudentIds,
                    groupIds: selectedGroupIds,
                }
            });

            const newEvents = response.data.map((assignment: TrainingAssignment) => ({
                id: assignment.id,
                title: `${assignment.workout_name || assignment.training.title} - ${assignment.user?.name || 'Unknown'}`,
                start: new Date(assignment.scheduledDate),
                end: new Date(new Date(assignment.scheduledDate).getTime() + 60 * 60 * 1000), // Default 1 hour
                resource: {
                    type: assignment.completed ? 'COMPLETED' : 'PLANNED',
                    details: assignment,
                    description: assignment.training.description,
                },
            }));
            setEvents(newEvents);
        } catch (error) {
            console.error('Failed to fetch assignments', error);
        }
    }, [currentRange, selectedStudentIds, selectedGroupIds]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchAssignments();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [fetchAssignments]);

    const handleDateChange = (range: { start: Date; end: Date }) => {
        setCurrentRange(range);
    };

    const handleToggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id)
                ? prev.filter(sid => sid !== id)
                : [...prev, id]
        );
    };

    const handleToggleGroup = (id: string) => {
        setSelectedGroupIds(prev =>
            prev.includes(id)
                ? prev.filter(gid => gid !== id)
                : [...prev, id]
        );
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        router.push(`/workouts/${event.id}`);
    };

    const handleEventDrop = async ({ event, start }: EventDropArgs) => {
        const assignment = event.resource?.details as TrainingAssignment | undefined;
        if (!assignment) return;
        const dropDate = start instanceof Date ? start : new Date(start);
        const newDate = dropDate.toISOString().split('T')[0];

        const executeReschedule = async (applyToGroup: boolean) => {
            try {
                await api.patch(`/v2/trainings/assignments/${assignment.id}`, {
                    scheduledDate: newDate,
                    applyToGroup
                });
                fetchAssignments();
            } catch (error) {
                console.error('Failed to reschedule', error);
                showAlert('error', t('rescheduleError'));
            }
        };

        if (assignment.source_group_id) {
            showAlert(
                'warning',
                t('groupRescheduleMessage'),
                t('groupRescheduleTitle'),
                t('moveAll'),
                () => executeReschedule(true),
                t('onlyThisOne'),
                () => executeReschedule(false)
            );
        } else {
            executeReschedule(false);
        }
    };

    return (
        <div className="flex h-full p-4 md:p-8 space-x-6 overflow-hidden">
            <StudentFilter
                students={students}
                groups={groups}
                selectedStudentIds={selectedStudentIds}
                selectedGroupIds={selectedGroupIds}
                onToggleStudent={handleToggleStudent}
                onToggleGroup={handleToggleGroup}
                onSelectAllStudents={() => setSelectedStudentIds(students.map(s => s.id))}
                onDeselectAllStudents={() => setSelectedStudentIds([])}
            />
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('title')}</h1>
                </div>
                <div className="flex-1 min-h-0">
                    <CalendarView
                        events={events}
                        onDateChange={handleDateChange}
                        onSelectEvent={handleSelectEvent}
                        onEventDrop={handleEventDrop}
                    />
                </div>
            </div>

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                onConfirm={alertState.onConfirm}
                onCancel={alertState.onCancel}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />
        </div>
    );
}
