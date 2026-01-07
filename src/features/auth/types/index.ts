import { Session } from '@supabase/supabase-js';

export enum Role {
    COACH = 'COACH',
    ATHLETE = 'ATHLETE',
}

export interface User {
    id: string;
    avatarUrl?: string;
    mustChangePassword?: boolean;
    email: string;
    name?: string;
    role: Role;
}

export interface Profile {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    must_change_password: boolean;
    created_at: string;
    updated_at: string;
}

export interface AuthResponse {
    user: User;
    session: Session;
}
