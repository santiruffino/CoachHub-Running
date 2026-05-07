export type SmartAlertType = 'zone_violation' | 'new_feedback' | 'rpe_mismatch' | 'low_compliance' | 'missing_workout';

export type AlertPriority = 'P1' | 'P2' | 'P3' | 'P4';

export interface AlertScoringInput {
    type: SmartAlertType;
    recurrence7d: number;
    raceProximityDays?: number;
    racePriority?: 'A' | 'B' | 'C' | null;
    rpeDifference?: number;
    complianceRate?: number;
    missingSessionCount?: number;
    hasRiskKeywords?: boolean;
    alreadyRead?: boolean;
    recentlyResolved?: boolean;
}

export interface AlertScoringResult {
    score: number;
    priority: AlertPriority;
    reasonCodes: string[];
    recommendedActionKey: 'contactNowAdjustLoad' | 'reviewAndAdjustWeek' | 'monitorAndCheckIn' | 'logAndMonitor';
}

const BASE_SCORE: Record<SmartAlertType, number> = {
    zone_violation: 45,
    rpe_mismatch: 40,
    low_compliance: 35,
    missing_workout: 30,
    new_feedback: 15,
};

function clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreToPriority(score: number): AlertPriority {
    if (score >= 80) return 'P1';
    if (score >= 60) return 'P2';
    if (score >= 35) return 'P3';
    return 'P4';
}

export function extractRiskKeywords(input: string): boolean {
    const value = input.toLowerCase();
    const keywords = [
        'dolor',
        'lesion',
        'lesión',
        'mareo',
        'agudo',
        'pinchazo',
        'calambre',
        'fatiga',
    ];

    return keywords.some((keyword) => value.includes(keyword));
}

export function computeAlertScore(input: AlertScoringInput): AlertScoringResult {
    let score = BASE_SCORE[input.type];
    const reasonCodes: string[] = [];

    if (input.recurrence7d >= 3) {
        score += 15;
        reasonCodes.push('RECURRENCE_HIGH');
    } else if (input.recurrence7d >= 1) {
        score += 8;
        reasonCodes.push('RECURRENCE_MEDIUM');
    }

    if (typeof input.raceProximityDays === 'number') {
        if (input.raceProximityDays <= 14) {
            score += 15;
            reasonCodes.push('RACE_PROXIMITY_14D');
        } else if (input.raceProximityDays <= 30) {
            score += 8;
            reasonCodes.push('RACE_PROXIMITY_30D');
        }
    }

    if (input.racePriority === 'A') {
        score += 10;
        reasonCodes.push('RACE_PRIORITY_A');
    } else if (input.racePriority === 'B') {
        score += 5;
        reasonCodes.push('RACE_PRIORITY_B');
    }

    if (input.type === 'rpe_mismatch' && typeof input.rpeDifference === 'number') {
        if (input.rpeDifference >= 4) {
            score += 15;
            reasonCodes.push('RPE_GAP_CRITICAL');
        } else if (input.rpeDifference >= 2) {
            score += 8;
            reasonCodes.push('RPE_GAP_MODERATE');
        }
    }

    if (input.type === 'low_compliance' && typeof input.complianceRate === 'number') {
        if (input.complianceRate < 35) {
            score += 15;
            reasonCodes.push('COMPLIANCE_CRITICAL');
        } else if (input.complianceRate < 50) {
            score += 8;
            reasonCodes.push('COMPLIANCE_LOW');
        }
    }

    if (input.type === 'missing_workout' && typeof input.missingSessionCount === 'number' && input.missingSessionCount > 1) {
        score += 8;
        reasonCodes.push('MISSING_MULTIPLE');
    }

    if (input.hasRiskKeywords) {
        score += 25;
        reasonCodes.push('RISK_KEYWORD');
    }

    if (input.alreadyRead) {
        score -= 10;
        reasonCodes.push('ALREADY_READ');
    }

    if (input.recentlyResolved) {
        score -= 25;
        reasonCodes.push('RECENTLY_RESOLVED');
    }

    let priority = scoreToPriority(clampScore(score));

    if (input.type === 'new_feedback' && input.hasRiskKeywords && (priority === 'P3' || priority === 'P4')) {
        priority = 'P2';
        reasonCodes.push('MIN_PRIORITY_P2_RISK_FEEDBACK');
    }

    if (input.recurrence7d >= 3) {
        if (priority === 'P4') priority = 'P3';
        else if (priority === 'P3') priority = 'P2';
        else if (priority === 'P2') priority = 'P1';
    }

    const scoreForPriority = clampScore(score);

    const recommendedActionKey =
        priority === 'P1'
            ? 'contactNowAdjustLoad'
            : priority === 'P2'
                ? 'reviewAndAdjustWeek'
                : priority === 'P3'
                    ? 'monitorAndCheckIn'
                    : 'logAndMonitor';

    return {
        score: scoreForPriority,
        priority,
        reasonCodes,
        recommendedActionKey,
    };
}
