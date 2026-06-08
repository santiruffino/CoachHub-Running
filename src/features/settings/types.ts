export interface CoachSettings {
  thresholds: {
    rpeMismatchThreshold: number;
    lowComplianceThreshold: number;
  };
  defaultModels: {
    workoutMatcherModel: string;
    complianceModel: string;
  };
}

export interface TeamSettings {
  thresholds: {
    rpeMismatchThreshold: number;
    lowComplianceThreshold: number;
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
