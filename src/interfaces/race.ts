export type RacePriority = 'A' | 'B' | 'C';
export type RaceStatus = 'PLANNED' | 'COMPLETED' | 'DNR';

export interface Race {
  id: string;
  coach_id: string | null;
  team_id: string | null;
  name: string;
  description: string | null;
  distance: string | null;
  elevation_gain: number | null;
  location: string | null;
  date: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface AthleteRace {
  id: string;
  athlete_id: string;
  race_id: string | null;
  name_override: string | null;
  date: string;
  priority: RacePriority;
  target_time: string | null;
  status: RaceStatus;
  result_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  race?: Race;
}

export interface CreateRaceDTO {
  name: string;
  coach_id: string;
  team_id?: string;
  description?: string;
  distance?: string;
  date?: string;
  elevation_gain?: number;
  location?: string;
  is_template?: boolean;
}

export interface AssignRaceDTO {
  athlete_id: string;
  race_id?: string;
  name_override?: string;
  date: string;
  priority: RacePriority;
  target_time?: string;
  status?: RaceStatus;
  notes?: string;
}
