import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import { useState } from 'react';
import { ActivityDetailModal } from './ActivityDetailModal';

interface StravaActivity {
    id: string; // our DB ID
    externalId: string;
    title: string;
    type: string;
    distance: number;
    duration: number; // moving time
    startDate: string;
    elevationGain: number;
}

interface StravaActivitiesListProps {
    activities: StravaActivity[];
    loading: boolean;
}

export function StravaActivitiesList({ activities, loading }: StravaActivitiesListProps) {
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

    if (loading) {
        return (
            <Card>
                <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
                <CardContent className="h-40 animate-pulse bg-gray-100 rounded"></CardContent>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
                <CardContent className="text-center text-gray-500 py-8">
                    No activities synced yet.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Distance</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Elev.</TableHead>
                            <TableHead className="text-right">Link</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {activities.map((activity) => (
                            <TableRow
                                key={activity.id}
                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setSelectedActivityId(activity.id)}
                            >
                                <TableCell>{format(new Date(activity.startDate), 'PP')}</TableCell>
                                <TableCell className="font-medium">{activity.title}</TableCell>
                                <TableCell>{activity.type}</TableCell>
                                <TableCell>{(activity.distance / 1000).toFixed(2)} km</TableCell>
                                <TableCell>{formatDuration(activity.duration)}</TableCell>
                                <TableCell>{activity.elevationGain?.toFixed(0)} m</TableCell>
                                <TableCell className="text-right">
                                    <a
                                        href={`https://www.strava.com/activities/${activity.externalId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-[#FC5200] hover:underline text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        View on Strava
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            <ActivityDetailModal
                activityId={selectedActivityId}
                open={!!selectedActivityId}
                onClose={() => setSelectedActivityId(null)}
            />
        </Card>
    );
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
