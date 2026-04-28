import { User, Role } from '@/interfaces/auth';
import { AthleteProfile } from '@/interfaces/athlete';

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    bio?: string;
    specialty?: string;
    experience?: string;
    height?: number | string;
    weight?: number | string;
    injuries?: string;
    restHR?: number | string;
    maxHR?: number | string;
    vam?: string;
    uan?: string;
    dob?: string;
    isOnboardingCompleted?: boolean;
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
