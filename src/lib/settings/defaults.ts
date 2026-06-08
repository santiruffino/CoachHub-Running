import { CoachSettings, TeamSettings } from '@/features/settings/types';

export const DEFAULT_THRESHOLDS = {
  rpeMismatchThreshold: 2,
  lowComplianceThreshold: 50,
};

export const DEFAULT_MODELS = {
  workoutMatcherModel: 'baseline-v1',
  complianceModel: 'baseline-v1',
};

export const DEFAULT_TEAM_BRANDING = {
  teamName: 'Endurix Team',
  logoUrl: '',
  primaryColor: '#1f2937',
};

export function normalizeCoachSettings(input: {
  thresholds?: Record<string, unknown> | null;
  default_models?: Record<string, unknown> | null;
  defaultModels?: Record<string, unknown> | null;
}): CoachSettings {
  const thresholds = input.thresholds || {};
  const defaultModels = input.default_models || input.defaultModels || {};

  return {
    thresholds: {
      rpeMismatchThreshold:
        typeof thresholds.rpeMismatchThreshold === 'number'
          ? thresholds.rpeMismatchThreshold
          : DEFAULT_THRESHOLDS.rpeMismatchThreshold,
      lowComplianceThreshold:
        typeof thresholds.lowComplianceThreshold === 'number'
          ? thresholds.lowComplianceThreshold
          : DEFAULT_THRESHOLDS.lowComplianceThreshold,
    },
    defaultModels: {
      workoutMatcherModel:
        typeof defaultModels.workoutMatcherModel === 'string'
          ? defaultModels.workoutMatcherModel
          : DEFAULT_MODELS.workoutMatcherModel,
      complianceModel:
        typeof defaultModels.complianceModel === 'string'
          ? defaultModels.complianceModel
          : DEFAULT_MODELS.complianceModel,
    },
  };
}

export function normalizeTeamSettings(input: {
  thresholds?: Record<string, unknown> | null;
  branding?: Record<string, unknown> | null;
  default_models?: Record<string, unknown> | null;
  defaultModels?: Record<string, unknown> | null;
  limits?: Record<string, unknown> | null;
}): TeamSettings {
  const coachSettings = normalizeCoachSettings(input);
  const branding = input.branding || {};
  const limits = input.limits || {};

  return {
    thresholds: coachSettings.thresholds,
    defaultModels: coachSettings.defaultModels,
    branding: {
      teamName:
        typeof branding.teamName === 'string' && branding.teamName.trim().length > 0
          ? branding.teamName
          : DEFAULT_TEAM_BRANDING.teamName,
      logoUrl: typeof branding.logoUrl === 'string' ? branding.logoUrl : DEFAULT_TEAM_BRANDING.logoUrl,
      primaryColor:
        typeof branding.primaryColor === 'string' && branding.primaryColor.trim().length > 0
          ? branding.primaryColor
          : DEFAULT_TEAM_BRANDING.primaryColor,
    },
    limits: {
      maxAthletes:
        limits.maxAthletes === null || limits.maxAthletes === undefined
          ? null
          : typeof limits.maxAthletes === 'number' && limits.maxAthletes > 0
            ? limits.maxAthletes
            : null,
    },
  };
}
