import { User } from './auth';

export interface HeartRateZones {
    zones: Array<{ min: number; max: number }>;
    custom_zones?: boolean;
}

export type MetricType = 'VAM' | 'UAN';

export interface AthleteMetric {
    id: string;
    type: MetricType;
    value: string;      // Test pace stored as "mm:ss"
    date: string;
    created_at: string;
}

export interface AthleteProfile {
    height?: number;
    weight?: number;
    injuries?: string;
    restHR?: number;
    maxHR?: number;
    lthr?: number;   // Lactate Threshold Heart Rate (bpm)
    vam?: string;
    uan?: string;
    ftp?: number;
    dob?: string;
    coachNotes?: string;
    hrZones?: HeartRateZones;
    metricsHistory?: AthleteMetric[];   // VAM/UAN test history, newest first
}

export interface Athlete {
    id: string;
    name: string;
    email: string;
    athleteProfile?: {
        height: number;
        weight: number;
    };
    weeklyStats?: {
        planned: number;
        completed: number;
        completionRate: number;
    };
}

export interface AthleteDetails extends User {
    athleteProfile?: AthleteProfile;
    athleteGroups?: Array<{
        group: {
            name: string;
        };
    }>;
}

export interface AthleteData {
  id: string;
  name: string;
  email: string;
  sport: string;
  level: string;
  coach?: { id: string; name: string } | null;
  groups: { id: string; name: string }[];
  totalTrainings: number;
  plannedTrainings: number;
  completedTrainings: number;
  completionPercentage: number;
}

export interface GroupAthleteData {
  id: string;
  name: string;
  email: string;
  sport: string;
  level: string;
  totalTrainings: number;
  plannedTrainings: number;
  completedTrainings: number;
  completionPercentage: number;
}

export interface ProfileDetails extends User {
    garmin_pilot_enabled?: boolean;
    coachProfile?: {
        bio: string;
        specialty: string;
        experience: string;
        _count?: {
            athletes: number;
        }
    };
    athleteProfile?: AthleteProfile;
}
