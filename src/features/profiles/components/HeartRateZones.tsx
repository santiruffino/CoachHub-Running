'use client';

import { HeartRateZones as HeartRateZonesType } from '@/features/profiles/types';

interface HeartRateZonesProps {
    zones: HeartRateZonesType | null | undefined;
}

const ZONE_COLORS = [
    'bg-blue-400',
    'bg-emerald-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-red-500',
];

const ZONE_LABELS = [
    'Z1 — Recuperación',
    'Z2 — Resistencia',
    'Z3 — Aeróbico',
    'Z4 — Umbral',
    'Z5 — Máximo',
];

const ZONE_PERCENTAGES = [5, 18, 40, 25, 12];

export function HeartRateZones({ zones }: HeartRateZonesProps) {
    if (!zones || !zones.zones || zones.zones.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No hay zonas de FC configuradas. Añade tu FC máxima y de reposo para generarlas.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {zones.zones
                .slice()
                .reverse()
                .map((zone, index) => {
                    const originalIndex = zones.zones.length - 1 - index;
                    const color = ZONE_COLORS[originalIndex] ?? 'bg-muted-foreground';
                    const label = ZONE_LABELS[originalIndex] ?? `Z${originalIndex + 1}`;
                    const percentage = ZONE_PERCENTAGES[originalIndex] ?? 0;

                    return (
                        <div key={originalIndex} className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                            <span className="text-xs font-medium text-muted-foreground w-36 shrink-0">
                                {label}
                            </span>
                            <span className="text-xs font-semibold text-foreground w-20 text-right">
                                {zone.min}–{zone.max}
                            </span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${color} rounded-full transition-all duration-500`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
