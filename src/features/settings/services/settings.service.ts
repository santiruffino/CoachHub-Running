import api from '@/lib/axios';
import { CoachSettings, TeamSettings } from '@/features/settings/types';

export const settingsService = {
  getCoachSettings: async () => api.get<CoachSettings>('/v2/settings/coach'),
  updateCoachSettings: async (payload: CoachSettings) => api.patch<CoachSettings>('/v2/settings/coach', payload),
  getTeamSettings: async () => api.get<TeamSettings>('/v2/settings/team'),
  updateTeamSettings: async (payload: TeamSettings) => api.patch<TeamSettings>('/v2/settings/team', payload),
};
