'use client';

import { WorkoutBlock, WorkoutTotals, AthleteProfile } from './types';
import { TrainingType } from '@/interfaces/training';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { parsePaceToSeconds, VAM_ZONES } from '@/features/profiles/constants/vam';

interface SessionSummaryProps {
    blocks: WorkoutBlock[];
    athleteProfile?: AthleteProfile | null;
    trainingType?: TrainingType;
}

export function calculateTotals(
    blocks: WorkoutBlock[], 
    athleteProfile?: AthleteProfile | null,
    trainingType: TrainingType = TrainingType.RUNNING
): WorkoutTotals {
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
        } else if (block.target?.type === 'power_zone') {
            const zoneNum = Number(block.target.min);
            // Coggan Power Zones approx
            const zones = [0.45, 0.65, 0.83, 0.98, 1.13, 1.35, 1.6];
            intensityFactor = zones[zoneNum - 1] || 0.75;
        } else if (block.target?.type === 'ftp_percent') {
            const min = typeof block.target.min === 'number' ? block.target.min : parseFloat(block.target.min);
            const max = typeof block.target.max === 'number' ? block.target.max : parseFloat(block.target.max);
            intensityFactor = ((min + max) / 2) / 100;
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
            
            if (trainingType === TrainingType.CYCLING) {
                // For cycling, we assume a base speed of 30 km/h if no profile info is used for IF
                const baseSpeedMs = (30 * intensityFactor) / 3.6;
                stepDurationSecs = baseSpeedMs > 0 ? distMeters / baseSpeedMs : distMeters * (120 / 1000); // 120s/km = 30km/h
            } else if (athleteProfile?.vam) {
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
            
            if (trainingType === TrainingType.CYCLING) {
                const baseSpeedMs = (30 * intensityFactor) / 3.6;
                const distKm = (stepDurationSecs * baseSpeedMs) / 1000;
                totalDistance += distKm * multiplier;
            } else if (athleteProfile?.vam) {
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

export function SessionSummary({ blocks, athleteProfile, trainingType = TrainingType.RUNNING }: SessionSummaryProps) {
    const totals = useMemo(() => calculateTotals(blocks, athleteProfile, trainingType), [blocks, athleteProfile, trainingType]);
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

    const getEstimatedLoad = (tss: number) => {
        if (tss === 0) return { label: 'low', percent: 0 };
        if (tss <= 50) return { label: 'low', percent: Math.max(5, (tss / 50) * 33) };
        if (tss <= 100) return { label: 'medium', percent: 33 + ((tss - 50) / 50) * 33 };
        if (tss <= 150) return { label: 'high', percent: 66 + ((tss - 100) / 50) * 34 };
        return { label: 'veryHigh', percent: 100 };
    };

    const loadData = getEstimatedLoad(totals.tss);

    return (
        <div className="bg-[#4e6073] dark:bg-[#131b23] rounded-2xl p-6 text-white w-full shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold">{t('sessionSummary')}</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex flex-col border-r border-white/10 pr-6">
                    <span className="text-sm font-medium text-gray-300 mb-2">{t('duration')}</span>
                    <span className="text-3xl font-display font-bold tracking-tight">{totals.duration > 0 ? durationStr : '00:00'}</span>
                </div>
                
                <div className="flex flex-col border-r border-white/10 px-6">
                    <span className="text-sm font-medium text-gray-300 mb-2">{t('tss')}</span>
                    <span className="text-3xl font-display font-bold tracking-tight">{totals.tss}</span>
                </div>
                
                <div className="flex flex-col md:border-r border-white/10 md:px-6 pr-6">
                    <span className="text-sm font-medium text-gray-300 mb-2">{t('if')}</span>
                    <span className="text-3xl font-display font-bold tracking-tight">{avgIF}</span>
                </div>
                
                <div className="flex flex-col md:pl-6 justify-center">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{t('estimatedLoad')}</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-white">{t(loadData.label as 'low' | 'medium' | 'high' | 'veryHigh')}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-500 ease-in-out" style={{ width: `${loadData.percent}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
