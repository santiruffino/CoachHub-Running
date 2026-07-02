/**
 * Resolves an Endurix workout target (zone-based) into the concrete
 * bounds Garmin expects (bpm for HR, m·s⁻¹ for pace, watts for power).
 *
 * The physiological math mirrors what the workout builder already shows the
 * coach in src/features/trainings/components/builder/StepEditor.tsx, and reuses
 * the VAM utilities in src/features/profiles/constants/vam.ts so both surfaces
 * stay in agreement.
 *
 * When the athlete profile is missing the data required for a given target
 * (e.g. no LTHR set), we degrade to `{ kind: 'none' }` so the step is still
 * pushed to Garmin without an intensity target rather than failing the whole
 * workout.
 */

import { VAM_ZONES, calculateTargetPace, parsePaceToSeconds } from '@/features/profiles/constants/vam';
import type { TargetType, WorkoutBlock } from '@/features/trainings/components/builder/types';

export interface GarminAthleteProfile {
    vam?: string | null; // "min:sec" per km
    lthr?: number | null; // bpm
    maxHR?: number | null; // bpm
    restHR?: number | null; // bpm
    ftp?: number | null; // watts
}

export type ResolvedTarget =
    | { kind: 'heart_rate'; lowBpm: number; highBpm: number }
    | { kind: 'pace'; lowSpeedMs: number; highSpeedMs: number }
    | { kind: 'power'; lowWatts: number; highWatts: number }
    | { kind: 'none'; note?: string };

/** Standard cycling power zones as % of FTP (matches StepEditor). */
const POWER_ZONES = [
    { min: 0, max: 55 },
    { min: 56, max: 75 },
    { min: 76, max: 90 },
    { min: 91, max: 105 },
    { min: 106, max: 120 },
    { min: 121, max: 150 },
    { min: 151, max: 1000 },
];

function toNumber(value: number | string): number {
    return typeof value === 'number' ? value : parseFloat(value);
}

/** Convert a "min:sec" per-km pace into speed in metres per second. */
export function paceToSpeedMs(pace: string): number | null {
    const secondsPerKm = parsePaceToSeconds(pace);
    if (!secondsPerKm || secondsPerKm <= 0) return null;
    return 1000 / secondsPerKm;
}

export function resolveTarget(
    target: WorkoutBlock['target'],
    profile: GarminAthleteProfile | null | undefined,
    rpe?: number,
): ResolvedTarget {
    const type: TargetType = target.type;
    const min = toNumber(target.min);
    const max = toNumber(target.max);

    switch (type) {
        case 'lthr': {
            if (!profile?.lthr || !min || !max) {
                return { kind: 'none', note: 'LTHR target (no athlete LTHR data)' };
            }
            const lowBpm = Math.round((profile.lthr * min) / 100);
            const highBpm = Math.round((profile.lthr * max) / 100);
            return { kind: 'heart_rate', lowBpm, highBpm };
        }

        case 'hr_reserve': {
            if (!profile?.restHR || !profile?.maxHR || profile.maxHR <= profile.restHR || !min || !max) {
                return { kind: 'none', note: 'HR-reserve target (no athlete HR data)' };
            }
            const reserve = profile.maxHR - profile.restHR;
            const lowBpm = Math.round(profile.restHR + (min / 100) * reserve);
            const highBpm = Math.round(profile.restHR + (max / 100) * reserve);
            return { kind: 'heart_rate', lowBpm, highBpm };
        }

        case 'vam_zone': {
            const zone = VAM_ZONES.find((z) => z.zone === min);
            if (!zone) return { kind: 'none', note: 'VAM zone (unknown zone)' };
            if (!profile?.vam) {
                return { kind: 'none', note: `VAM zone ${min} (no athlete VAM data)` };
            }
            // Faster pace comes from the higher % of VAM (zone.max) → higher speed.
            const fastPace = calculateTargetPace(profile.vam, zone.max);
            const slowPace = calculateTargetPace(profile.vam, zone.min);
            const highSpeedMs = paceToSpeedMs(fastPace);
            const lowSpeedMs = paceToSpeedMs(slowPace);
            if (highSpeedMs == null || lowSpeedMs == null) {
                return { kind: 'none', note: `VAM zone ${min} (invalid pace)` };
            }
            return { kind: 'pace', lowSpeedMs, highSpeedMs };
        }

        case 'power_zone': {
            const zone = POWER_ZONES[min - 1];
            if (!zone) return { kind: 'none', note: 'Power zone (unknown zone)' };
            if (!profile?.ftp) {
                return { kind: 'none', note: `Power zone ${min} (no athlete FTP data)` };
            }
            const lowWatts = Math.round((profile.ftp * zone.min) / 100);
            const highWatts = Math.round((profile.ftp * zone.max) / 100);
            return { kind: 'power', lowWatts, highWatts };
        }

        case 'ftp_percent': {
            if (!profile?.ftp || !min || !max) {
                return { kind: 'none', note: 'FTP% target (no athlete FTP data)' };
            }
            const lowWatts = Math.round((profile.ftp * min) / 100);
            const highWatts = Math.round((profile.ftp * max) / 100);
            return { kind: 'power', lowWatts, highWatts };
        }

        case 'rpe_target': {
            // Garmin has no RPE target — surface it as a note on the step.
            const label = min === max ? `RPE ${min}` : `RPE ${min}-${max}`;
            return { kind: 'none', note: label };
        }

        default: {
            return { kind: 'none', note: rpe ? `RPE ${rpe}` : undefined };
        }
    }
}
