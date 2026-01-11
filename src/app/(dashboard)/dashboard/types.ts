export interface DashboardStats {
  activeAthletes: number;
  totalAthletes: number;
  activePlans: number;
  totalPlans: number;
  completedSessions: number;
  thisWeekSessions: number;
  completedToday: number;
  completionRate: number;
  totalGroups: number;
  athletesWithoutNextWeek: number;
  groupsWithoutNextWeek: number;
}

export interface RecentSession {
  id: string;
  athleteName: string;
  activityType: string;
  duration?: number;
  date: Date;
  completed: boolean;
}

export interface ActiveAthlete {
  id: string;
  name: string;
  email: string;
  sport?: string;
  level?: string;
}

export interface RPEMismatch {
  athleteId: string;
  athleteName: string;
  workoutType: string;
  expectedRPE: number;
  actualRPE: number;
  difference: number;
}

export interface MissingWorkout {
  id: string;
  name: string;
  type: 'athlete' | 'group';
  memberCount?: number;
}

export interface LowCompliance {
  athleteId: string;
  athleteName: string;
  completed: number;
  total: number;
  completionRate: number;
}