'use client';

import { HeartRateZones as HeartRateZonesType } from '@/features/profiles/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface HeartRateZonesProps {
    zones: HeartRateZonesType | null | undefined;
}

const ZONE_COLORS = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
];

const ZONE_LABELS = [
    'Zone 1 - Recovery',
    'Zone 2 - Endurance',
    'Zone 3 - Tempo',
    'Zone 4 - Threshold',
    'Zone 5 - VO2 Max',
];

export function HeartRateZones({ zones }: HeartRateZonesProps) {
    if (!zones || !zones.zones || zones.zones.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Heart Rate Zones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No heart rate zones configured. Connect to Strava to sync your zones.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Heart Rate Zones
                    </span>
                    {zones.custom_zones && (
                        <Badge variant="secondary" className="text-xs">
                            Custom
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {zones.zones.map((zone, index) => {
                        const color = ZONE_COLORS[index] || 'bg-gray-500';
                        const label = ZONE_LABELS[index] || `Zone ${index + 1}`;
                        const maxDisplay = zone.max === -1 ? 'Max' : `${zone.max} bpm`;

                        return (
                            <div key={index} className="group">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{label}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {zone.min} - {maxDisplay}
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color} transition-all duration-300 group-hover:opacity-80`}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                    {zones.custom_zones
                        ? 'Custom zones configured in Strava'
                        : 'Default zones calculated from max heart rate'}
                </p>
            </CardContent>
        </Card>
    );
}
