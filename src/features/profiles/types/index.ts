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
    }
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
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
