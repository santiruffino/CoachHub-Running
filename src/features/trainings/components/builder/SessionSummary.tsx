'use client';

import { WorkoutBlock, WorkoutTotals, AthleteProfile } from './types';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { parsePaceToSeconds, VAM_ZONES } from '@/features/profiles/constants/vam';

interface SessionSummaryProps {
    blocks: WorkoutBlock[];
    athleteProfile?: AthleteProfile | null;
}

function calculateTotals(blocks: WorkoutBlock[], athleteProfile?: AthleteProfile | null): WorkoutTotals {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalTSS = 0;

    blocks.forEach(block => {
        const multiplier = block.group?.reps || 1;
        let stepDurationSecs = 0;
        let intensityFactor = (block.intensity || 50) / 100;

        // Explicitly derive mathematical intensity from user's selected target
        if (block.target?.type === 'vam_zone') {
            const zoneNum = Number(block.target.min);
            const zone = VAM_ZONES.find(z => z.zone === zoneNum);
            if (zone) intensityFactor = ((zone.min + zone.max) / 2) / 100;
        } else if (block.target?.type === 'lthr') {
            const minTarget = Number(block.target.min);
            const maxTarget = Number(block.target.max);
            if (!isNaN(minTarget) && !isNaN(maxTarget)) {
                intensityFactor = ((minTarget + maxTarget) / 2) / 100;
            }
        }

        if (block.duration.type === 'distance') {
            const distMeters = block.duration.value;
            totalDistance += (distMeters / 1000) * multiplier;
            
            if (athleteProfile?.vam) {
                // If VAM is in mm:ss format, convert to km/h, otherwise assume it's directly km/h
                const vamSeconds = athleteProfile.vam.includes(':') 
                    ? parsePaceToSeconds(athleteProfile.vam) 
                    : 0;
                
                const vamKmh = vamSeconds > 0 
                    ? 3600 / vamSeconds 
                    : (parseFloat(athleteProfile.vam) || 15); // Fallback to 15 km/h if unparseable

                const targetSpeedMs = (vamKmh * intensityFactor) / 3.6;
                stepDurationSecs = targetSpeedMs > 0 ? distMeters / targetSpeedMs : distMeters * (330 / 1000);
            } else {
                const distKm = distMeters / 1000;
                // Estimate 5:30 min/km (330s) pace for duration
                stepDurationSecs = distKm * 330;
            }
            totalDuration += stepDurationSecs * multiplier;
        }

        if (block.duration.type === 'time') {
            stepDurationSecs = block.duration.value;
            totalDuration += stepDurationSecs * multiplier;
            
            if (athleteProfile?.vam) {
                const vamSeconds = athleteProfile.vam.includes(':') 
                    ? parsePaceToSeconds(athleteProfile.vam) 
                    : 0;
                
                const vamKmh = vamSeconds > 0 
                    ? 3600 / vamSeconds 
                    : (parseFloat(athleteProfile.vam) || 15);

                const targetSpeedMs = (vamKmh * intensityFactor) / 3.6;
                const distKm = (stepDurationSecs * targetSpeedMs) / 1000;
                totalDistance += distKm * multiplier;
            } else {
                // Estimate 5:30 min/km (330s) pace for distance
                totalDistance += (stepDurationSecs / 330) * multiplier;
            }
        }

        const durationHours = (stepDurationSecs * multiplier) / 3600;
        totalTSS += durationHours * Math.pow(intensityFactor, 2) * 100;
    });

    return {
        distance: totalDistance,
        duration: totalDuration,
        tss: Math.round(totalTSS)
    };
}

export function SessionSummary({ blocks, athleteProfile }: SessionSummaryProps) {
    const totals = useMemo(() => calculateTotals(blocks, athleteProfile), [blocks, athleteProfile]);
    const t = useTranslations('builder');

    const formatDurationParts = (totalSeconds: number) => {
        const seconds = Math.round(totalSeconds);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
           return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const durationStr = formatDurationParts(totals.duration);
    
    const avgIF = totals.duration > 0 ? Math.sqrt(totals.tss / (totals.duration / 3600) / 100).toFixed(2) : '0.00';

    return (
        <div className="flex flex-col text-white w-full">
            <h2 className="text-xl font-display font-bold mb-6">{t('sessionSummary')}</h2>
            
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-sm font-medium text-gray-300">{t('duration')}</span>
                    <span className="text-2xl font-display font-bold tracking-tight">{totals.duration > 0 ? durationStr : '00:00'}</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-sm font-medium text-gray-300">{t('tss')}</span>
                    <span className="text-2xl font-display font-bold tracking-tight">{totals.tss}</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-sm font-medium text-gray-300">{t('if')}</span>
                    <span className="text-2xl font-display font-bold tracking-tight">{avgIF}</span>
                </div>
                
                <div className="flex flex-col pt-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{t('estimatedLoad')}</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-white">{t('high')}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: '80%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
