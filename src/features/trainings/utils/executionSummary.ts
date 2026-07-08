/**
 * Execution Summary — athlete-facing, always-positive read of how a workout was
 * executed. Pure functions (no React), derived entirely from data already
 * available client-side: activity laps, the workout match, and Strava best
 * efforts. Never surfaces a raw "red"; poor execution is reframed as a tip.
 */
import type { Lap, BestEffort } from '@/interfaces/activity';
import type { MatchedLap, FlatStep } from './workoutMatcher';

export interface ExecutionSummaryInput {
    laps?: Lap[];
    matchedLaps?: MatchedLap[];
    flatSteps?: FlatStep[];
    bestEfforts?: BestEffort[];
    /** Training type of the linked session (e.g. RUNNING), used for PR flavor. */
    sessionType?: string;
}

export interface RepsResult {
    done: number;
    planned: number;
}

export interface ConsistencyResult {
    /** Coefficient of variation of active-rep pace, as a percentage. */
    cvPercent: number;
    /** 0-100, higher = more even reps. */
    score: number;
    level: 'high' | 'medium' | 'low';
    sampleSize: number;
}

export interface SplitResult {
    type: 'negative' | 'even' | 'positive';
    /** Seconds per km. */
    firstHalfPace: number;
    secondHalfPace: number;
    /** secondHalf - firstHalf, seconds per km (negative = sped up). */
    deltaSeconds: number;
}

export interface PersonalRecord {
    name: string;
    timeSec: number;
    prRank: number;
}

export interface ExecutionHighlight {
    /** i18n key suffix under activities.detail.executionSummary.highlights.* */
    key: string;
    tone: 'celebrate' | 'positive' | 'tip';
    params?: Record<string, string | number>;
}

export interface ExecutionSummary {
    reps?: RepsResult;
    consistency?: ConsistencyResult;
    split?: SplitResult;
    personalRecords: PersonalRecord[];
    highlights: ExecutionHighlight[];
    hasContent: boolean;
}

const EASY_SESSION_TYPES = new Set(['RECOVERY', 'EASY', 'REST']);

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const m = mean(values);
    const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

/** Map lapIndex -> stepType from the workout match. */
function buildMatchedTypeMap(matchedLaps?: MatchedLap[]): Map<number, string> {
    const map = new Map<number, string>();
    (matchedLaps || []).forEach(ml => {
        if (ml.matched) map.set(ml.lapIndex, ml.stepType);
    });
    return map;
}

function computeReps(matchedLaps: MatchedLap[] | undefined, flatSteps: FlatStep[] | undefined): RepsResult | undefined {
    if (!flatSteps || flatSteps.length === 0) return undefined;
    const planned = flatSteps.filter(s => s.stepType === 'active').length;
    if (planned === 0) return undefined;

    const doneStepIndices = new Set<number>();
    (matchedLaps || []).forEach(ml => {
        if (ml.matched && ml.stepType === 'active' && ml.stepIndex !== null) {
            doneStepIndices.add(ml.stepIndex);
        }
    });
    return { done: Math.min(doneStepIndices.size, planned), planned };
}

function computeConsistency(laps: Lap[], matchedTypes: Map<number, string>): ConsistencyResult | undefined {
    // Only meaningful when we can isolate the "active" reps.
    const activeSpeeds = laps
        .filter(lap => matchedTypes.get(lap.lap_index) === 'active' && (lap.average_speed || 0) > 0)
        .map(lap => lap.average_speed);

    if (activeSpeeds.length < 2) return undefined;

    const cvPercent = (stdDev(activeSpeeds) / mean(activeSpeeds)) * 100;
    const score = Math.round(Math.max(0, Math.min(100, 100 - cvPercent * 5)));
    const level: ConsistencyResult['level'] = cvPercent <= 4 ? 'high' : cvPercent <= 8 ? 'medium' : 'low';

    return { cvPercent: Math.round(cvPercent * 10) / 10, score, level, sampleSize: activeSpeeds.length };
}

function computeSplit(laps: Lap[], matchedTypes: Map<number, string>): SplitResult | undefined {
    // Exclude warmup/cooldown when we know them, so a slow warmup doesn't fake a
    // negative split. Fall back to all laps for unstructured runs.
    const hasMatch = matchedTypes.size > 0;
    const splitLaps = (hasMatch
        ? laps.filter(lap => {
            const type = matchedTypes.get(lap.lap_index);
            return type !== 'warmup' && type !== 'cooldown';
        })
        : laps
    ).filter(lap => (lap.distance || 0) > 0 && (lap.moving_time || 0) > 0);

    const totalDistance = splitLaps.reduce((sum, lap) => sum + lap.distance, 0);
    if (totalDistance < 2000 || splitLaps.length < 2) return undefined; // need enough to be meaningful

    const half = totalDistance / 2;
    let acc = 0;
    let firstDist = 0;
    let firstTime = 0;
    let secondDist = 0;
    let secondTime = 0;

    for (const lap of splitLaps) {
        const remainingToHalf = half - acc;
        if (remainingToHalf <= 0) {
            secondDist += lap.distance;
            secondTime += lap.moving_time;
        } else if (lap.distance <= remainingToHalf) {
            firstDist += lap.distance;
            firstTime += lap.moving_time;
        } else {
            // Split this lap proportionally across the midpoint.
            const fracFirst = remainingToHalf / lap.distance;
            firstDist += lap.distance * fracFirst;
            firstTime += lap.moving_time * fracFirst;
            secondDist += lap.distance * (1 - fracFirst);
            secondTime += lap.moving_time * (1 - fracFirst);
        }
        acc += lap.distance;
    }

    if (firstDist <= 0 || secondDist <= 0) return undefined;

    const firstHalfPace = firstTime / (firstDist / 1000);
    const secondHalfPace = secondTime / (secondDist / 1000);
    const deltaSeconds = Math.round(secondHalfPace - firstHalfPace);
    const type: SplitResult['type'] = deltaSeconds <= -2 ? 'negative' : deltaSeconds >= 2 ? 'positive' : 'even';

    return {
        type,
        firstHalfPace: Math.round(firstHalfPace),
        secondHalfPace: Math.round(secondHalfPace),
        deltaSeconds,
    };
}

function computePersonalRecords(bestEfforts: BestEffort[] | undefined): PersonalRecord[] {
    return (bestEfforts || [])
        .filter(e => typeof e.pr_rank === 'number' && e.pr_rank! >= 1 && e.pr_rank! <= 3)
        .sort((a, b) => (a.pr_rank! - b.pr_rank!) || (a.distance - b.distance))
        .map(e => ({ name: e.name, timeSec: e.elapsed_time, prRank: e.pr_rank! }));
}

/**
 * Compute the athlete-facing execution summary. Every field is optional and the
 * function never throws on partial data — callers render only what is present.
 */
export function computeExecutionSummary(input: ExecutionSummaryInput): ExecutionSummary {
    const laps = input.laps || [];
    const matchedTypes = buildMatchedTypeMap(input.matchedLaps);

    const reps = computeReps(input.matchedLaps, input.flatSteps);
    const consistency = laps.length >= 2 ? computeConsistency(laps, matchedTypes) : undefined;
    const split = laps.length >= 2 ? computeSplit(laps, matchedTypes) : undefined;
    const personalRecords = computePersonalRecords(input.bestEfforts);

    const highlights = buildHighlights({ reps, consistency, split, personalRecords, sessionType: input.sessionType });

    const hasContent = Boolean(reps || consistency || split || personalRecords.length > 0 || highlights.length > 0);

    return { reps, consistency, split, personalRecords, highlights, hasContent };
}

function buildHighlights(args: {
    reps?: RepsResult;
    consistency?: ConsistencyResult;
    split?: SplitResult;
    personalRecords: PersonalRecord[];
    sessionType?: string;
}): ExecutionHighlight[] {
    const { reps, consistency, split, personalRecords, sessionType } = args;
    const highlights: ExecutionHighlight[] = [];

    // 1. Personal record — the biggest dopamine hit.
    const topPr = personalRecords.find(pr => pr.prRank === 1);
    if (topPr) {
        const easyFlavor = sessionType ? EASY_SESSION_TYPES.has(sessionType.toUpperCase()) : false;
        highlights.push({
            key: easyFlavor ? 'newPrEasy' : 'newPr',
            tone: 'celebrate',
            params: { distance: topPr.name },
        });
    } else {
        const podium = personalRecords.find(pr => pr.prRank === 2 || pr.prRank === 3);
        if (podium) {
            highlights.push({ key: 'topEffort', tone: 'positive', params: { distance: podium.name, rank: podium.prRank } });
        }
    }

    // 2. Negative split.
    if (split?.type === 'negative') {
        highlights.push({ key: 'negativeSplit', tone: 'positive', params: { delta: Math.abs(split.deltaSeconds) } });
    }

    // 3. Even, consistent reps.
    if (consistency && consistency.level === 'high' && consistency.sampleSize >= 3) {
        highlights.push({ key: 'consistentReps', tone: 'positive', params: { count: consistency.sampleSize } });
    }

    // 4. Completed the planned structure.
    if (reps && reps.done > 0) {
        if (reps.done >= reps.planned) {
            highlights.push({ key: 'allRepsDone', tone: 'positive', params: { planned: reps.planned } });
        } else {
            highlights.push({ key: 'someRepsDone', tone: 'positive', params: { done: reps.done, planned: reps.planned } });
        }
    }

    // 5. Constructive tip on a fade — only if we haven't got much to celebrate,
    // so it never reads as piling-on criticism.
    if (split?.type === 'positive' && highlights.length < 2) {
        highlights.push({ key: 'positiveSplitTip', tone: 'tip', params: { delta: split.deltaSeconds } });
    }

    return highlights.slice(0, 4);
}
