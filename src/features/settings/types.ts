export type DashboardPriorityItem = 'load_risk' | 'compliance' | 'rpe_mismatch';
export type DuplicateHandling = 'skip' | 'flag' | 'replace';
export type WeekStartsOn = 'monday' | 'sunday';

export interface CoachSettings {
  thresholds: {
    rpeMismatchThreshold: number;
    lowComplianceThreshold: number;
    matchingThresholdPercentage: number;
    loadRiskHighAcwr: number;
    loadRiskModerateAcwr: number;
    loadRiskLowStimulusAcwr: number;
    loadRiskHighTsb: number;
    loadRiskModerateTsb: number;
    loadRiskLowStimulusTsb: number;
  };
  defaultModels: {
    workoutMatcherModel: string;
    complianceModel: string;
  };
  preferences: {
    workoutMatching: {
      autoLink: boolean;
    };
    dashboard: {
      priorityOrder: DashboardPriorityItem[];
    };
    planning: {
      defaultRpe: number;
      restDaysPerWeek: number;
      weekStartsOn: WeekStartsOn;
    };
    strava: {
      autoMatch: boolean;
      duplicateHandling: DuplicateHandling;
    };
  };
}

export interface TeamSettings {
  thresholds: {
    rpeMismatchThreshold: number;
    lowComplianceThreshold: number;
    matchingThresholdPercentage: number;
    loadRiskHighAcwr: number;
    loadRiskModerateAcwr: number;
    loadRiskLowStimulusAcwr: number;
    loadRiskHighTsb: number;
    loadRiskModerateTsb: number;
    loadRiskLowStimulusTsb: number;
  };
  branding: {
    teamName: string;
    logoUrl: string;
    primaryColor: string;
  };
  defaultModels: {
    workoutMatcherModel: string;
    complianceModel: string;
  };
  limits: {
    maxAthletes: number | null;
  };
}
