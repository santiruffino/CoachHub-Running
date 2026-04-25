import { User } from './auth';

export interface HeartRateZones {
    zones: Array<{ min: number; max: number }>;
    custom_zones?: boolean;
}

export interface AthleteProfile {
    height?: number;
    weight?: number;
    injuries?: string;
    restHR?: number;
    maxHR?: number;
    vam?: string;
    uan?: string;
    dob?: string;
    coachNotes?: string;
    hrZones?: HeartRateZones;
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
