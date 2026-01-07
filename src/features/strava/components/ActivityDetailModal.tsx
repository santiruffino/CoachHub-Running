import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { stravaService } from '../services/strava.service';
import { Loader2, Activity, Heart, Mountain } from 'lucide-react';
import { ActivityChart } from './ActivityChart';
import { format } from 'date-fns';

interface ActivityDetailModalProps {
    activityId: string | null;
    open: boolean;
    onClose: () => void;
}

export function ActivityDetailModal({ activityId, open, onClose }: ActivityDetailModalProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null); // Full activity with streams

    useEffect(() => {
        if (open && activityId) {
            setLoading(true);
            stravaService.getActivityDetails(activityId)
                .then(res => setData(res))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            setData(null);
        }
    }, [open, activityId]);

    // Helper to extract stream data
    const getStreamData = (type: string) => {
        if (!data || !data.streams) return [];
        const stream = data.streams.find((s: any) => s.type === type);
        if (!stream) return [];

        // Strava streams usually allow 'data' as array of numbers
        // Our DB stores 'data' as Json, so we cast it
        const values = stream.data as number[];

        return values.map((val, idx) => ({ index: idx, value: val }));
    };

    const hrData = getStreamData('HEART_RATE');
    const paceData = getStreamData('PACE'); // Note: Strava sends pace as m/s usually, might need conversion
    // const elevationData = getStreamData('ALTITUDE'); // Need to map enum correctly

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {data?.type === 'Run' ? '🏃' : '🚴'}
                        {data?.title || 'Activity Details'}
                    </DialogTitle>
                    <p className="text-sm text-gray-500">
                        {data?.startDate && format(new Date(data.startDate), 'PPP p')}
                    </p>
                </DialogHeader>

                {loading ? (
                    <div className="h-60 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Distance</p>
                                <p className="text-lg font-bold">{(data.distance / 1000).toFixed(2)} km</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Time</p>
                                <p className="text-lg font-bold">{Math.floor(data.duration / 60)}m {data.duration % 60}s</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Avg HR</p>
                                <p className="text-lg font-bold flex items-center gap-1">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    {data.avgHr ? Math.round(data.avgHr) : '--'} bpm
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Elevation</p>
                                <p className="text-lg font-bold flex items-center gap-1">
                                    <Mountain className="w-4 h-4 text-gray-600" />
                                    {data.elevationGain ? Math.round(data.elevationGain) : '--'} m
                                </p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="space-y-6">
                            {hrData.length > 0 && (
                                <ActivityChart data={hrData} type="heart_rate" color="#EF4444" />
                            )}

                            {/* Pace chart usually inverted (lower is faster), specialized handling might be needed later */}
                            {/* {paceData.length > 0 && (
                                <ActivityChart data={paceData} type="pace" color="#3B82F6" />
                            )} */}

                            {/* {elevationData.length > 0 && (
                                <ActivityChart data={elevationData} type="elevation" color="#10B981" />
                            )} */}

                            {hrData.length === 0 && (
                                <div className="text-center py-8 text-gray-400">
                                    No detailed chart data available for this activity.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-red-400">
                        Failed to load activity details.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
