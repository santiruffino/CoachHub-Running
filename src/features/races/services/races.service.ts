import api from '@/lib/axios';
import { Race, AthleteRace, CreateRaceDTO, AssignRaceDTO } from '../types';

interface DeleteResponse {
  message?: string;
}

interface GroupRaceAssignResponse {
  success: boolean;
  raceId: string;
  groupId: string;
  assignedCount: number;
}

export const racesService = {
  /**
   * Get all races available to the user
   */
  findAll: async () => {
    return api.get<Race[]>('/v2/races');
  },

  /**
   * Create a new race template
   */
  create: async (data: Partial<CreateRaceDTO>) => {
    return api.post<Race>('/v2/races', data);
  },

  /**
   * Update a race template
   */
  update: async (raceId: string, data: Partial<CreateRaceDTO>) => {
    return api.patch<Race>(`/v2/races/${raceId}`, data);
  },

  /**
   * Delete a race template
   */
  delete: async (raceId: string) => {
    return api.delete<DeleteResponse>(`/v2/races/${raceId}`);
  },

  /**
   * Get races assigned to a specific user
   */
  findByUser: async (userId: string) => {
    return api.get<AthleteRace[]>(`/v2/users/${userId}/races`);
  },

  /**
   * Assign a race to a user
   */
  assignToUser: async (userId: string, data: AssignRaceDTO) => {
    return api.post<AthleteRace>(`/v2/users/${userId}/races`, data);
  },

  /**
   * Assign a race to all members of a group
   */
  assignToGroup: async (raceId: string, groupId: string, data: Partial<AssignRaceDTO>) => {
    return api.post<GroupRaceAssignResponse>(`/v2/groups/${groupId}/races/${raceId}`, data);
  },

  /**
   * Update an assigned race (athlete_race)
   */
  updateAthleteRace: async (userId: string, athleteRaceId: string, data: Partial<AthleteRace>) => {
    // Note: We might need a specific endpoint for this if it's not handled by POST
    // Assuming we might need PATCH /v2/users/[id]/races/[athleteRaceId]
    // For now, I'll follow the pattern and implement the ones explicitly asked.
    return api.patch<AthleteRace>(`/v2/users/${userId}/races/${athleteRaceId}`, data);
  },

  /**
   * Remove a race assignment
   */
  deleteAthleteRace: async (userId: string, athleteRaceId: string) => {
    return api.delete<DeleteResponse>(`/v2/users/${userId}/races/${athleteRaceId}`);
  }
};
