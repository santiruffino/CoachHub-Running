import { User } from '@/interfaces/auth';
import { AthleteProfile } from '@/interfaces/athlete';

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    bio?: string;
    specialty?: string;
    experience?: string;
    height?: number | string | null;
    weight?: number | string | null;
    injuries?: string;
    restHR?: number | string | null;
    maxHR?: number | string | null;
    lthr?: number | string | null;
    ftp?: number | string | null;
    vam?: string;
    uan?: string;
    dob?: string;
    isOnboardingCompleted?: boolean;
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
