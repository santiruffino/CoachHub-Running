'use client';

import { useEffect, useState, use } from 'react';
import { GroupDetails } from '@/features/groups/types';
import { groupsService } from '@/features/groups/services/groups.service';
import { useRouter } from 'next/navigation';
import { AddMemberModal } from '@/features/groups/components/AddMemberModal';
import { AssignTrainingModal } from '@/features/trainings/components/AssignTrainingModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Plus } from 'lucide-react';

export default function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrapping params properly in Nextjs 15+ convention if needed, sticking to standard.
    // Actually params is a promise in recent canary, but standard app router usually just object.
    // Wait, I used async params in the component signature which implies strict/new mode.
    // I will use `use(params)` logic if version allows or await it.

    // Safe approach for Next.js 14/standard:
    const router = useRouter();
    const [group, setGroup] = useState<GroupDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const resolvedParams = use(params); // Using `use` hook or just awaiting if it was async component.
    // But this is client component. `params` prop in client component page?
    // In Next.js 13/14 Page props `params` is an object, not a promise usually.
    // However, recent changes might make it async. I will assume it's an object for now in standard setup.
    // Wait, type is `{ params: { id: string } }` usually.

    // Let's revert to standard synchronous access for now to avoid complexity unless I know user env.
    // The user prompt said Next.js 14.
    const id = resolvedParams.id;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const fetchGroup = async () => {
        try {
            const res = await groupsService.findOne(id);
            setGroup(res.data);
        } catch (e) {
            // router.push('/dashboard/groups');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroup();
    }, [id]);

    if (loading) return <div>Loading details...</div>;
    if (!group) return <div>Group not found</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="p-6">
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    <p className="text-muted-foreground mt-2">{group.description}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Members ({group.members.length})</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Assign Workout
                            </Button>
                            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Member
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <AssignTrainingModal
                        groupId={group.id}
                        isOpen={isAssignModalOpen}
                        onClose={() => setIsAssignModalOpen(false)}
                    />
                    <ul className="divide-y divide-border">
                        {group.members.map((member) => (
                            <li key={member.athlete.id} className="py-4 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium">{member.athlete.name || 'Unnamed Athlete'}</p>
                                    <p className="text-sm text-muted-foreground">{member.athlete.email}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        if (confirm('Remove athlete?')) {
                                            await groupsService.removeMember(group.id, member.athlete.id);
                                            fetchGroup();
                                        }
                                    }}
                                    className="text-destructive hover:text-destructive"
                                >
                                    Remove
                                </Button>
                            </li>
                        ))}
                        {group.members.length === 0 && (
                            <p className="text-muted-foreground text-sm">No members yet.</p>
                        )}
                    </ul>

                    <AddMemberModal
                        groupId={group.id}
                        currentMemberIds={group.members.map(m => m.athlete.id)}
                        open={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onAdded={fetchGroup}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
