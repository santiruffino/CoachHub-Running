export type AthleteStatus = 'optimal' | 'stable' | 'alert' | 'monitor';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface MockAthlete {
  id: string;
  name: string;
  initials: string;
  sport: string;
  tss: number;
  form: number;
  status: AthleteStatus;
  trend: TrendDirection;
  compliance: number;
  lastActivity: string;
}

export interface WeeklyDataPoint {
  day: string;
  tss: number;
  highlight?: boolean;
}

export interface UpcomingWorkout {
  id: string;
  athleteName: string;
  type: string;
  time: string;
  zone: string;
  zoneNum: number;
}

export interface Alert {
  id: string;
  athleteName: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timeAgo: string;
}

export const mockAthletes: MockAthlete[] = [
  {
    id: '1', name: 'Carlos M.', initials: 'CM', sport: 'Maratón',
    tss: 487, form: 87, status: 'optimal', trend: 'up', compliance: 95, lastActivity: 'Hace 2h',
  },
  {
    id: '2', name: 'Laura S.', initials: 'LS', sport: 'Media Maratón',
    tss: 362, form: 73, status: 'stable', trend: 'stable', compliance: 80, lastActivity: 'Ayer',
  },
  {
    id: '3', name: 'Diego R.', initials: 'DR', sport: 'Trail Running',
    tss: 198, form: 45, status: 'alert', trend: 'down', compliance: 60, lastActivity: 'Hace 3h',
  },
  {
    id: '4', name: 'Ana P.', initials: 'AP', sport: 'Base Training',
    tss: 521, form: 91, status: 'optimal', trend: 'up', compliance: 98, lastActivity: 'Hace 1h',
  },
  {
    id: '5', name: 'Martín V.', initials: 'MV', sport: 'Recuperación',
    tss: 143, form: 62, status: 'monitor', trend: 'stable', compliance: 72, lastActivity: 'Hace 5h',
  },
  {
    id: '6', name: 'Sofía L.', initials: 'SL', sport: '10K Competición',
    tss: 415, form: 79, status: 'stable', trend: 'up', compliance: 88, lastActivity: 'Ayer',
  },
];

export const weeklyData: WeeklyDataPoint[] = [
  { day: 'L', tss: 52 },
  { day: 'M', tss: 71 },
  { day: 'M', tss: 38 },
  { day: 'J', tss: 94, highlight: true },
  { day: 'V', tss: 67 },
  { day: 'S', tss: 89 },
  { day: 'D', tss: 48 },
];

export const upcomingWorkouts: UpcomingWorkout[] = [
  { id: '1', athleteName: 'Carlos M.', type: '5×1km Intervalos', time: 'Hoy, 17:00', zone: 'ZONA 4', zoneNum: 4 },
  { id: '2', athleteName: 'Ana P.', type: 'Carrera Larga 28km', time: 'Mañana, 07:00', zone: 'ZONA 2', zoneNum: 2 },
  { id: '3', athleteName: 'Sofía L.', type: 'Tempo 8km', time: 'Mar, 06:30', zone: 'ZONA 3', zoneNum: 3 },
  { id: '4', athleteName: 'Laura S.', type: 'Recuperación 40min', time: 'Mar, 08:00', zone: 'ZONA 1', zoneNum: 1 },
];

export const alerts: Alert[] = [
  {
    id: '1', athleteName: 'Diego R.',
    message: 'RPE 9 reportado en sesión Z4. Excede zona objetivo.',
    severity: 'high', timeAgo: 'Hace 2h',
  },
  {
    id: '2', athleteName: 'Laura S.',
    message: 'Sin entrenamientos planificados la próxima semana.',
    severity: 'medium', timeAgo: '1d',
  },
  {
    id: '3', athleteName: 'Martín V.',
    message: 'FC en reposo elevada 3 días consecutivos.',
    severity: 'medium', timeAgo: '3d',
  },
];

export const zoneBreakdown = [
  { label: 'ZONA 1–2', pct: 45, color: '#EBE9EC' },
  { label: 'ZONA 3', pct: 25, color: '#111317' },
  { label: 'ZONA 4–5', pct: 30, color: '#FF6800' },
];
