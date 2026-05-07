import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { stravaService } from '../services/strava.service';
import { Loader2, Heart, Mountain } from 'lucide-react';
import { ActivityChart } from './ActivityChart';
import { format } from 'date-fns';
import { StravaActivityDetailResponse } from '../services/strava.service';
import { useTranslations } from 'next-intl';
import { isGarminSource } from '@/lib/strava/source';

const EMPTY_ACTIVITY: StravaActivityDetailResponse = {
    id: '',
    title: '',
    type: '',
    distance: 0,
    duration: 0,
    startDate: '',
    streams: [],
};

interface ActivityDetailModalProps {
    activityId: string | null;
    open: boolean;
    onClose: () => void;
}

export function ActivityDetailModal({ activityId, open, onClose }: ActivityDetailModalProps) {
    const t = useTranslations('strava.activityDetail');
    const [data, setData] = useState<StravaActivityDetailResponse>(EMPTY_ACTIVITY);
    const hasGarminSource = isGarminSource(data.device_name);

    const loading = open && !!activityId && (data.id === '' || data.id !== activityId);
    const isLoaded = data.id !== '' && !!activityId && data.id === activityId;

    useEffect(() => {
        if (!open || !activityId) {
            return;
        }

        let cancelled = false;

        stravaService.getActivityDetails(activityId)
            .then((res) => {
                if (!cancelled) {
                    setData(res);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error(err);
                    setData(EMPTY_ACTIVITY);
                }
            })
            .finally(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [open, activityId]);

    // Helper to extract stream data
    const getStreamData = (type: string) => {
        if (!data.streams) return [];
        const stream = data.streams.find((s) => s.type === type);
        if (!stream) return [];

        const values = stream.data;

        return values.map((val, idx) => ({ index: idx, value: val }));
    };

    const hrData = getStreamData('HEART_RATE');
    const paceData = getStreamData('PACE');
    void paceData;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {data?.type === 'Run' ? '🏃' : '🚴'}
                        {data?.title || t('title')}
                    </DialogTitle>
                    <p className="text-sm text-gray-500">
                        {data?.startDate && format(new Date(data.startDate), 'PPP p')}
                    </p>
                </DialogHeader>

                {loading ? (
                    <div className="h-60 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                    </div>
                ) : isLoaded ? (
                    <div className="space-y-6">
                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">{t('distance')}</p>
                                <p className="text-lg font-bold">{(data.distance / 1000).toFixed(2)} km</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">{t('time')}</p>
                                <p className="text-lg font-bold">{Math.floor(data.duration / 60)}m {data.duration % 60}s</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">{t('avgHr')}</p>
                                <p className="text-lg font-bold flex items-center gap-1">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    {data.avgHr ? Math.round(data.avgHr) : '--'} bpm
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">{t('elevation')}</p>
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
                                    {t('noDetailedData')}
                                </div>
                            )}

                            {hasGarminSource && (
                                <p className="text-xs text-muted-foreground">
                                    {t('garminAttribution')}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-red-400">
                        {t('failedToLoad')}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
