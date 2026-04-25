export interface Coach {
    id: string;
    name: string;
    email: string;
    role?: string;
    lastActivity?: string | null;
    totalAthletes?: number;
    _count?: {
        athletes: number;
    };
}

export interface CoachData {
    id: string;
    name: string;
    email: string;
    athletesCount?: number;
    totalAthletes?: number;
}
