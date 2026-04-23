import { User } from '@/features/auth/types';

export interface Group {
    id: string;
    name: string;
    description?: string;
    coachId: string;
    group_type?: 'REGULAR' | 'RACE';
    race_name?: string;
    race_date?: string;
    race_distance?: string;
    race_priority?: 'A' | 'B' | 'C';
    is_archived?: boolean;
    _count?: []
}

export interface GroupDetails extends Group {
    members: {
        athlete: User
    }[]
}

export interface CreateGroupDto {
    name: string;
    description?: string;
    group_type?: 'REGULAR' | 'RACE';
    race_name?: string;
    race_date?: string;
    race_distance?: string;
    race_priority?: 'A' | 'B' | 'C';
}
