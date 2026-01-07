'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Group } from '@/features/groups/types';
import { groupsService } from '@/features/groups/services/groups.service';
import { CreateGroupForm } from '@/features/groups/components/CreateGroupForm';
import { UsersRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        try {
            const res = await groupsService.findAll();
            setGroups(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Groups</h1>
            </div>

            <CreateGroupForm onSuccess={fetchGroups} />

            {loading ? (
                <div>Loading groups...</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <Link key={group.id} href={`/groups/${group.id}`} className="block">
                            <Card className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 bg-primary/10 p-3 rounded-full">
                                            <UsersRound className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-lg font-medium">{group.name}</h3>
                                            <p className="text-sm text-muted-foreground">{group._count?.members || 0} Members</p>
                                        </div>
                                    </div>
                                    {group.description && (
                                        <p className="mt-4 text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {groups.length === 0 && (
                        <p className="text-muted-foreground col-span-full text-center py-10">No groups created yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}
