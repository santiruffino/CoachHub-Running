import { User } from '@/features/auth/types';

export interface Group {
    id: string;
    name: string;
    description?: string;
    coachId: string;
    _count?: {
        members: number;
    }
}

export interface GroupDetails extends Group {
    members: {
        athlete: User
    }[]
}

export interface CreateGroupDto {
    name: string;
    description?: string;
}
