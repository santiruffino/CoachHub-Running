import { Session } from '@supabase/supabase-js';

export enum Role {
    COACH = 'COACH',
    ATHLETE = 'ATHLETE',
    ADMIN = 'ADMIN',
}

export interface User {
    id: string;
    avatarUrl?: string;
    mustChangePassword?: boolean;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    isOnboardingCompleted?: boolean;
    role: Role;
}

export interface Profile {
    id: string;
    email: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    gender: string | null;
    is_onboarding_completed: boolean;
    role: Role;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    user: User;
    session: Session;
}
