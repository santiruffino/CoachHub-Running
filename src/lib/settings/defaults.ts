import { CoachSettings, DashboardPriorityItem, DuplicateHandling, TeamSettings, WeekStartsOn } from '@/features/settings/types';

export const DEFAULT_THRESHOLDS = {
  rpeMismatchThreshold: 2,
  lowComplianceThreshold: 50,
  matchingThresholdPercentage: 15,
  loadRiskHighAcwr: 1.5,
  loadRiskModerateAcwr: 1.3,
  loadRiskLowStimulusAcwr: 0.8,
  loadRiskHighTsb: -30,
  loadRiskModerateTsb: -15,
  loadRiskLowStimulusTsb: 25,
};

export const DEFAULT_MODELS = {
  workoutMatcherModel: 'baseline-v1',
  complianceModel: 'baseline-v1',
};

export const DEFAULT_PREFERENCES = {
  workoutMatching: {
    autoLink: true,
  },
  dashboard: {
    priorityOrder: ['load_risk', 'compliance', 'rpe_mismatch'] as DashboardPriorityItem[],
  },
  planning: {
    defaultRpe: 7,
    restDaysPerWeek: 1,
    weekStartsOn: 'monday' as WeekStartsOn,
  },
  strava: {
    autoMatch: true,
    duplicateHandling: 'skip' as DuplicateHandling,
  },
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
  preferences?: Record<string, unknown> | null;
}): CoachSettings {
  const thresholds = input.thresholds || {};
  const defaultModels = input.default_models || input.defaultModels || {};
  const prefs = (input.preferences || {}) as Record<string, Record<string, unknown>>;
  const prefsWm = (prefs.workoutMatching || {}) as Record<string, unknown>;
  const prefsDash = (prefs.dashboard || {}) as Record<string, unknown>;
  const prefsPlanning = (prefs.planning || {}) as Record<string, unknown>;
  const prefsStrava = (prefs.strava || {}) as Record<string, unknown>;

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
      matchingThresholdPercentage:
        typeof thresholds.matchingThresholdPercentage === 'number'
          ? thresholds.matchingThresholdPercentage
          : DEFAULT_THRESHOLDS.matchingThresholdPercentage,
      loadRiskHighAcwr:
        typeof thresholds.loadRiskHighAcwr === 'number'
          ? thresholds.loadRiskHighAcwr
          : DEFAULT_THRESHOLDS.loadRiskHighAcwr,
      loadRiskModerateAcwr:
        typeof thresholds.loadRiskModerateAcwr === 'number'
          ? thresholds.loadRiskModerateAcwr
          : DEFAULT_THRESHOLDS.loadRiskModerateAcwr,
      loadRiskLowStimulusAcwr:
        typeof thresholds.loadRiskLowStimulusAcwr === 'number'
          ? thresholds.loadRiskLowStimulusAcwr
          : DEFAULT_THRESHOLDS.loadRiskLowStimulusAcwr,
      loadRiskHighTsb:
        typeof thresholds.loadRiskHighTsb === 'number'
          ? thresholds.loadRiskHighTsb
          : DEFAULT_THRESHOLDS.loadRiskHighTsb,
      loadRiskModerateTsb:
        typeof thresholds.loadRiskModerateTsb === 'number'
          ? thresholds.loadRiskModerateTsb
          : DEFAULT_THRESHOLDS.loadRiskModerateTsb,
      loadRiskLowStimulusTsb:
        typeof thresholds.loadRiskLowStimulusTsb === 'number'
          ? thresholds.loadRiskLowStimulusTsb
          : DEFAULT_THRESHOLDS.loadRiskLowStimulusTsb,
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
    preferences: {
      workoutMatching: {
        autoLink: typeof prefsWm.autoLink === 'boolean' ? prefsWm.autoLink : DEFAULT_PREFERENCES.workoutMatching.autoLink,
      },
      dashboard: {
        priorityOrder: Array.isArray(prefsDash.priorityOrder) && prefsDash.priorityOrder.length > 0
          ? (prefsDash.priorityOrder as DashboardPriorityItem[])
          : DEFAULT_PREFERENCES.dashboard.priorityOrder,
      },
      planning: {
        defaultRpe: typeof prefsPlanning.defaultRpe === 'number' ? prefsPlanning.defaultRpe : DEFAULT_PREFERENCES.planning.defaultRpe,
        restDaysPerWeek: typeof prefsPlanning.restDaysPerWeek === 'number' ? prefsPlanning.restDaysPerWeek : DEFAULT_PREFERENCES.planning.restDaysPerWeek,
        weekStartsOn: (prefsPlanning.weekStartsOn === 'monday' || prefsPlanning.weekStartsOn === 'sunday')
          ? prefsPlanning.weekStartsOn
          : DEFAULT_PREFERENCES.planning.weekStartsOn,
      },
      strava: {
        autoMatch: typeof prefsStrava.autoMatch === 'boolean' ? prefsStrava.autoMatch : DEFAULT_PREFERENCES.strava.autoMatch,
        duplicateHandling: (['skip', 'flag', 'replace'] as DuplicateHandling[]).includes(prefsStrava.duplicateHandling as DuplicateHandling)
          ? (prefsStrava.duplicateHandling as DuplicateHandling)
          : DEFAULT_PREFERENCES.strava.duplicateHandling,
      },
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
