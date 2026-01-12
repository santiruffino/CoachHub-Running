import { User } from '@/features/auth/types';

export interface ProfileDetails extends User {
    coachProfile?: {
        bio: string;
        specialty: string;
        experience: string;
    };
    athleteProfile?: {
        height: number;
        weight: number;
        injuries: string;
        restHR?: number;
        maxHR?: number;
        rest_hr?: number; // Support both naming conventions
        max_hr?: number;
        vam?: string;
        uan?: string;
        dob?: string;
        hrZones?: HeartRateZones;
    }
}

export interface HeartRateZone {
    min: number;
    max: number;
}

export interface HeartRateZones {
    zones: HeartRateZone[];
    custom_zones?: boolean;
}

export interface UpdateProfileDto {
    bio?: string;
    specialty?: string;
    experience?: string;
    height?: number;
    weight?: number;
    injuries?: string;
    restHR?: number;
    maxHR?: number;
    vam?: string;
    uan?: string;
    dob?: string; // Date of birth
    hrZones?: HeartRateZones;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
