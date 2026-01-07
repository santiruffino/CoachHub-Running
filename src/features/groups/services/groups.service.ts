import api from '@/lib/axios';
import { Group, GroupDetails, CreateGroupDto } from '../types';

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

    delete: async (id: string) => {
        return api.delete(`/v2/groups/${id}`);
    },

    addMember: async (groupId: string, athleteId: string) => {
        return api.post(`/v2/groups/${groupId}/members`, { athleteId });
    },

    removeMember: async (groupId: string, athleteId: string) => {
        return api.delete(`/v2/groups/${groupId}/members`, { data: { athleteId } });
    }
};
