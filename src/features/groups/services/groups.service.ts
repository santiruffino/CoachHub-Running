import api from '@/lib/axios';
import { Group, GroupDetails, CreateGroupDto } from '@/interfaces/group';

interface DeleteResponse {
    message?: string;
}

interface GroupMembership {
    id: string;
    group_id: string;
    athlete_id: string;
    joined_at?: string;
}

export const groupsService = {
    findAll: async () => {
        return api.get<Group[]>('/v2/groups');
    },

    findOne: async (id: string) => {
        return api.get<GroupDetails>(`/v2/groups/${id}`);
    },

    create: async (data: CreateGroupDto) => {
        return api.post<Group>('/v2/groups', data);
    },

    update: async (id: string, data: Partial<CreateGroupDto>) => {
        return api.patch<Group>(`/v2/groups/${id}`, data);
    },

    delete: async (id: string) => {
        return api.delete<DeleteResponse>(`/v2/groups/${id}`);
    },

    addMember: async (groupId: string, athleteId: string) => {
        return api.post<GroupMembership>(`/v2/groups/${groupId}/members`, { athleteId });
    },

    removeMember: async (groupId: string, athleteId: string) => {
        return api.delete<DeleteResponse>(`/v2/groups/${groupId}/members`, { data: { athleteId } });
    }
};
