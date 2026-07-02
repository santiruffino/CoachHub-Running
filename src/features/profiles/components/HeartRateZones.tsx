'use client';

import { HeartRateZones as HeartRateZonesType } from '@/interfaces/athlete';

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

function formatZoneRange(zone: { min: number; max: number }, isLastZone: boolean) {
    const openEnded = isLastZone || zone.max <= 0 || zone.max < zone.min;

    if (openEnded) {
        return `${zone.min}+ bpm`;
    }

    return `${zone.min}–${zone.max} bpm`;
}

function formatZoneNote(zone: { min: number; max: number }, isLastZone: boolean) {
    const openEnded = isLastZone || zone.max <= 0 || zone.max < zone.min;

    if (openEnded) {
        return 'Sin tope superior';
    }

    return `${zone.max - zone.min + 1} bpm de ancho`;
}

export function HeartRateZones({ zones }: HeartRateZonesProps) {
    if (!zones || !zones.zones || zones.zones.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-endurix-black/10 dark:border-border bg-white/50 dark:bg-white/5 p-4">
                <p className="text-sm font-medium text-endurix-black dark:text-foreground">
                    No hay zonas de FC configuradas.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Añade tu FC máxima y de reposo para generarlas desde Strava.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-endurix-black/10 dark:border-border bg-endurix-black/5 dark:bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                            Zonas de frecuencia cardíaca
                        </p>
                        <p className="mt-1 text-sm text-endurix-black dark:text-foreground">
                            {zones.custom_zones ? 'Usando zonas personalizadas de Strava.' : 'Usando las zonas estándar de Strava.'}
                        </p>
                    </div>
                    <span className="rounded-full border border-endurix-black/10 dark:border-border bg-white/70 dark:bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {zones.zones.length} zonas
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {zones.zones.map((zone, index) => {
                    const color = ZONE_COLORS[index] ?? 'bg-muted-foreground';
                    const label = ZONE_LABELS[index] ?? `Z${index + 1}`;
                    const range = formatZoneRange(zone, index === zones.zones.length - 1);
                    const note = formatZoneNote(zone, index === zones.zones.length - 1);

                    return (
                        <div key={`${label}-${zone.min}-${zone.max}`} className="flex items-stretch gap-3 rounded-2xl border border-endurix-black/10 dark:border-border bg-white/80 dark:bg-card px-4 py-3">
                            <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${color}`} />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                            {label}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-endurix-black dark:text-foreground tabular-nums">
                                            {range}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-endurix-black/5 dark:bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {note}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
